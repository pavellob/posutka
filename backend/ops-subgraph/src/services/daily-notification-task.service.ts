import { createGraphQLLogger } from '@repo/shared-logger';
import type { IOpsDL, ICleaningDL, IDataLayerInventory, IBookingsDL } from '@repo/datalayer';
import type { PrismaClient } from '@prisma/client';
import type { InventoryGrpcClient, EventsGrpcClient } from '@repo/grpc-sdk';
import { EventsEventType } from '@repo/grpc-sdk';

const logger = createGraphQLLogger('daily-notification-task-service');

export interface CreateDailyNotificationTaskInput {
  orgId: string;
  taskType: 'CLEANING' | 'REPAIR';
  targetDate: Date;
}

export class DailyNotificationTaskService {
  constructor(
    private readonly dl: IOpsDL,
    private readonly cleaningDL: ICleaningDL,
    private readonly prisma: PrismaClient,
    private readonly inventoryDL: IDataLayerInventory,
    private readonly bookingsDL: IBookingsDL,
    private readonly inventoryGrpcClient: InventoryGrpcClient,
    private readonly eventsGrpcClient: EventsGrpcClient
  ) {}

  async createDailyNotificationTask(input: CreateDailyNotificationTaskInput) {
    logger.info('Creating daily notification task', {
      orgId: input.orgId,
      taskType: input.taskType,
      targetDate: input.targetDate.toISOString(),
    });

    // 1. Найти менеджера организации
    let manager = await this.prisma.membership.findFirst({
      where: {
        orgId: input.orgId,
        role: 'MANAGER',
      },
      select: { userId: true },
    });

    let managerId = manager?.userId;

    if (!managerId) {
      logger.info('No manager found in organization, trying global manager', {
        orgId: input.orgId,
      });
      const globalManager = await this.prisma.membership.findFirst({
        where: {
          role: 'MANAGER',
        },
        select: { userId: true },
      });
      managerId = globalManager?.userId;
    }

    if (!managerId) {
      throw new Error('No manager found for organization');
    }

    logger.info('Manager found', { managerId, orgId: input.orgId });

    // 2. Получить список уборок/ремонтов на targetDate
    const startOfDay = new Date(input.targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(input.targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let allTasks: any[] = [];

    if (input.taskType === 'CLEANING') {
      const cleaningsResult = await this.cleaningDL.listCleanings({
        orgId: input.orgId,
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString(),
        status: ['SCHEDULED', 'IN_PROGRESS'],
        first: 1000,
      });
      allTasks = cleaningsResult.edges.map((e) => e.node);
    } else {
      const repairsResult = await this.cleaningDL.listRepairs({
        orgId: input.orgId,
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString(),
        status: ['PLANNED', 'IN_PROGRESS'],
        first: 1000,
      });
      allTasks = repairsResult.edges.map((e) => e.node);
    }

    logger.info('Tasks found', {
      taskType: input.taskType,
      count: allTasks.length,
      sampleTask: allTasks[0] ? {
        id: allTasks[0].id,
        unitId: allTasks[0].unitId,
        cleanerId: allTasks[0].cleanerId,
        masterId: allTasks[0].masterId,
        scheduledAt: allTasks[0].scheduledAt,
      } : null,
    });

    // 3. Собрать уникальные unitId
    const unitIds = new Set<string>();
    allTasks.forEach((task) => {
      if (task.unitId) {
        unitIds.add(task.unitId);
      } else {
        logger.warn('Task has no unitId', {
          taskId: task.id,
          taskType: input.taskType,
        });
      }
    });

    logger.info('Unique unitIds collected', {
      count: unitIds.size,
      unitIds: Array.from(unitIds),
    });

    // 4. Получить информацию о юнитах через inventory gRPC
    const unitDataMap = new Map<
      string,
      { unitName: string; unitAddress: string | null }
    >();

    for (const unitId of unitIds) {
      try {
        logger.info('Fetching unit data via datalayer', { unitId });
        const unit = await this.inventoryDL.getUnitById(unitId);

        logger.info('Unit data received from datalayer', {
          unitId,
          hasUnit: !!unit,
          unitName: unit?.name,
          propertyId: unit?.propertyId,
        });

        if (unit) {
          let unitAddress: string | null = null;

          if (unit.propertyId) {
            try {
              logger.info('Fetching property data via datalayer', {
                unitId,
                propertyId: unit.propertyId,
              });
              const property = await this.inventoryDL.getPropertyById(unit.propertyId);
              logger.info('Property data received from datalayer', {
                unitId,
                propertyId: unit.propertyId,
                hasProperty: !!property,
                address: property?.address,
              });
              if (property) {
                unitAddress = property.address || null;
              }
            } catch (error) {
              logger.warn('Failed to get property for unit', {
                unitId,
                propertyId: unit.propertyId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          } else {
            logger.warn('Unit has no propertyId', {
              unitId,
              unitName: unit.name,
            });
          }

          const unitData = {
            unitName: unit.name || 'Неизвестная квартира',
            unitAddress,
          };
          unitDataMap.set(unitId, unitData);
          logger.info('Unit data stored', {
            unitId,
            unitData,
          });
        } else {
          logger.warn('Unit not found in datalayer', {
            unitId,
          });
          unitDataMap.set(unitId, {
            unitName: 'Неизвестная квартира',
            unitAddress: null,
          });
        }
      } catch (error) {
        logger.error('Failed to get unit from datalayer', {
          unitId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        unitDataMap.set(unitId, {
          unitName: 'Неизвестная квартира',
          unitAddress: null,
        });
      }
    }

    logger.info('Unit data map completed', {
      totalUnits: unitDataMap.size,
      unitDataEntries: Array.from(unitDataMap.entries()).map(([id, data]) => ({
        unitId: id,
        unitName: data.unitName,
        hasAddress: !!data.unitAddress,
      })),
    });

    // 5. Сформировать массив tasksList с данными
    const tasksList = await Promise.all(
      allTasks.map(async (item) => {
        logger.info('Processing task item', {
          taskId: item.id,
          unitId: item.unitId,
          cleanerId: item.cleanerId,
          masterId: item.masterId,
          scheduledAt: item.scheduledAt,
          hasUnitInMap: unitDataMap.has(item.unitId || ''),
        });

        const unitData =
          unitDataMap.get(item.unitId) ||
          ({ unitName: 'Неизвестная квартира', unitAddress: null } as {
            unitName: string;
            unitAddress: string | null;
          });

        logger.info('Unit data resolved', {
          taskId: item.id,
          unitName: unitData.unitName,
          unitAddress: unitData.unitAddress,
        });

        let executorName: string | null = null;

        if (input.taskType === 'CLEANING' && item.cleanerId) {
          try {
            const cleaner = await this.cleaningDL.getCleanerById(item.cleanerId);
            if (cleaner) {
              executorName = `${cleaner.firstName} ${cleaner.lastName}`;
              logger.info('Cleaner found', {
                taskId: item.id,
                cleanerId: item.cleanerId,
                executorName,
              });
            } else {
              logger.warn('Cleaner not found', {
                taskId: item.id,
                cleanerId: item.cleanerId,
              });
            }
          } catch (error) {
            logger.warn('Failed to get cleaner', {
              cleanerId: item.cleanerId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } else if (input.taskType === 'REPAIR' && item.masterId) {
          try {
            const master = await this.cleaningDL.getMasterById(item.masterId);
            if (master) {
              executorName = `${master.firstName} ${master.lastName}`;
              logger.info('Master found', {
                taskId: item.id,
                masterId: item.masterId,
                executorName,
              });
            } else {
              logger.warn('Master not found', {
                taskId: item.id,
                masterId: item.masterId,
              });
            }
          } catch (error) {
            logger.warn('Failed to get master', {
              masterId: item.masterId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } else {
          logger.info('No executor ID found', {
            taskId: item.id,
            taskType: input.taskType,
            hasCleanerId: !!item.cleanerId,
            hasMasterId: !!item.masterId,
          });
        }

        // Для уборок получаем notes, difficulty и templateId
        let notes: string | null = null;
        let difficulty: number | null = null;
        let templateId: string | null = null;
        let checkoutBooking: any = null;
        let checkinBooking: any = null;
        
        if (input.taskType === 'CLEANING') {
          try {
            const cleaning = await this.cleaningDL.getCleaningById(item.id);
            if (cleaning) {
              notes = cleaning.notes || null;
              // templateId в Cleaning связан с CleaningTemplate, а не с ChecklistTemplate
              // Поэтому получаем templateId из ChecklistInstance
              try {
                const checklistInstance = await this.prisma.checklistInstance.findFirst({
                  where: { cleaningId: cleaning.id },
                  select: { templateId: true },
                });
                templateId = checklistInstance?.templateId || null;
              } catch (error) {
                logger.warn('Failed to get templateId from ChecklistInstance', {
                  cleaningId: cleaning.id,
                  error: error instanceof Error ? error.message : String(error),
                });
                templateId = null;
              }
              // Преобразуем assessedDifficulty из формата D0-D5 в число 0-5
              if (cleaning.assessedDifficulty) {
                const difficultyMatch = cleaning.assessedDifficulty.match(/D(\d)/);
                if (difficultyMatch) {
                  difficulty = parseInt(difficultyMatch[1], 10);
                }
              }
              logger.info('Cleaning data loaded', {
                cleaningId: item.id,
                hasNotes: !!notes,
                difficulty,
                templateId,
              });

              // Получаем информацию о бронированиях для уборки
              if (item.unitId && cleaning.scheduledAt) {
                try {
                  const scheduledDate = new Date(cleaning.scheduledAt);
                  const fromDate = new Date(scheduledDate);
                  fromDate.setDate(fromDate.getDate() - 30); // 30 дней назад для поиска выездов
                  fromDate.setHours(0, 0, 0, 0);
                  const toDate = new Date(scheduledDate);
                  toDate.setDate(toDate.getDate() + 7); // 7 дней вперед для поиска заездов
                  toDate.setHours(23, 59, 59, 999);

                  // Получаем все бронирования для unitId
                  const bookingsResult = await this.bookingsDL.listBookings({
                    unitId: item.unitId,
                    first: 200,
                  });

                  const allBookings = bookingsResult.edges.map(e => e.node);
                  
                  // Фильтруем только подтвержденные и pending бронирования
                  const confirmedBookings = allBookings.filter(
                    (b) => b.status === 'CONFIRMED' || b.status === 'PENDING'
                  );

                  // Фильтруем бронирования, которые пересекаются с диапазоном
                  const relevantBookings = confirmedBookings.filter((booking) => {
                    const checkIn = new Date(booking.checkIn);
                    const checkOut = new Date(booking.checkOut);
                    return (
                      (checkIn >= fromDate && checkIn <= toDate) ||
                      (checkOut >= fromDate && checkOut <= toDate) ||
                      (checkIn <= fromDate && checkOut >= toDate)
                    );
                  });

                  // Находим последний выезд до или в день уборки
                  const cleaningDate = new Date(scheduledDate);
                  cleaningDate.setHours(0, 0, 0, 0);

                  const checkoutCandidates = relevantBookings.filter((b) => {
                    const checkoutDate = new Date(b.checkOut);
                    checkoutDate.setHours(0, 0, 0, 0);
                    return checkoutDate <= cleaningDate;
                  });

                  if (checkoutCandidates.length > 0) {
                    checkoutBooking = checkoutCandidates.sort((a, b) => {
                      return new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime();
                    })[0];
                  }

                  // Находим первый заезд после или в день уборки
                  const checkinCandidates = relevantBookings.filter((b) => {
                    const checkinDate = new Date(b.checkIn);
                    checkinDate.setHours(0, 0, 0, 0);
                    return checkinDate >= cleaningDate;
                  });

                  if (checkinCandidates.length > 0) {
                    checkinBooking = checkinCandidates.sort((a, b) => {
                      return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
                    })[0];
                  }

                  logger.info('Bookings loaded for cleaning', {
                    cleaningId: item.id,
                    unitId: item.unitId,
                    hasCheckout: !!checkoutBooking,
                    hasCheckin: !!checkinBooking,
                  });
                } catch (error) {
                  logger.warn('Failed to get bookings for cleaning', {
                    cleaningId: item.id,
                    unitId: item.unitId,
                    error: error instanceof Error ? error.message : String(error),
                  });
                }
              }
            }
          } catch (error) {
            logger.warn('Failed to get cleaning data', {
              cleaningId: item.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Определяем executorId для группировки
        const executorId = input.taskType === 'CLEANING' 
          ? (item.cleanerId || null)
          : (item.masterId || null);

        const taskData = {
          [input.taskType === 'CLEANING' ? 'cleaningId' : 'repairId']:
            item.id,
          unitId: item.unitId,
          unitName: unitData.unitName,
          unitAddress: unitData.unitAddress,
          scheduledAt: item.scheduledAt,
          executorId: executorId || undefined,
          executorName: executorName || undefined,
          notes: notes || undefined,
          difficulty: difficulty !== null ? difficulty : undefined,
          templateId: templateId || undefined,
          checkoutBooking: checkoutBooking ? {
            id: checkoutBooking.id,
            checkOut: checkoutBooking.checkOut,
            departureTime: checkoutBooking.departureTime || undefined,
          } : undefined,
          checkinBooking: checkinBooking ? {
            id: checkinBooking.id,
            checkIn: checkinBooking.checkIn,
            arrivalTime: checkinBooking.arrivalTime || undefined,
          } : undefined,
        };

        logger.info('Task data prepared', {
          taskId: item.id,
          taskData,
        });

        return taskData;
      })
    );

    // 6. Группируем задачи по исполнителям для удобной организации
    const tasksByExecutor = new Map<string, any[]>();
    const tasksWithoutExecutor: any[] = [];

    tasksList.forEach((task) => {
      const executorId = task.executorId;
      if (executorId && task.executorName) {
        if (!tasksByExecutor.has(executorId)) {
          tasksByExecutor.set(executorId, []);
        }
        tasksByExecutor.get(executorId)!.push(task);
      } else {
        tasksWithoutExecutor.push(task);
      }
    });

    // Сортируем задачи внутри каждой группы по времени
    tasksByExecutor.forEach((tasks) => {
      tasks.sort((a, b) => {
        const timeA = new Date(a.scheduledAt).getTime();
        const timeB = new Date(b.scheduledAt).getTime();
        return timeA - timeB;
      });
    });

    // Сортируем задачи без исполнителя по времени
    tasksWithoutExecutor.sort((a, b) => {
      const timeA = new Date(a.scheduledAt).getTime();
      const timeB = new Date(b.scheduledAt).getTime();
      return timeA - timeB;
    });

    // Создаем структуру с группировкой
    const executorGroups = Array.from(tasksByExecutor.entries()).map(([executorId, tasks]) => ({
      executorId,
      executorName: tasks[0]?.executorName || null,
      tasksCount: tasks.length,
      tasks,
    }));

    // 7. Создать задачу типа DAILY_NOTIFICATION в статусе DRAFT
    // Сохраняем tasksList и группировку в note для последующего редактирования в UI
    const task = await this.dl.createTask({
      orgId: input.orgId,
      type: 'DAILY_NOTIFICATION',
      status: 'DRAFT',
      authorId: managerId,
      note: JSON.stringify({
        taskType: input.taskType,
        targetDate: input.targetDate.toISOString(),
        tasksCount: tasksList.length,
        tasks: tasksList, // Сохраняем полный список задач для редактирования
        executorGroups, // Группировка по исполнителям
        tasksWithoutExecutor, // Задачи без исполнителя
      }),
      dueAt: input.targetDate.toISOString(),
    });

    logger.info('Daily notification task created in DRAFT status', { 
      taskId: task.id,
      taskType: input.taskType,
      targetDate: input.targetDate.toISOString(),
      tasksCount: tasksList.length,
    });

    // НЕ отправляем событие автоматически - задача будет отправлена после редактирования в UI
    // Событие будет отправлено через отдельную мутацию sendDailyNotificationTask

    return task;
  }

  /**
   * Обновить задачу в ежедневном уведомлении (время, исполнитель)
   */
  async updateDailyNotificationTaskItem(
    taskId: string,
    itemId: string,
    scheduledAt?: Date,
    executorId?: string,
    notes?: string,
    difficulty?: number,
    templateId?: string
  ) {
    logger.info('Updating daily notification task item', {
      taskId,
      itemId,
      scheduledAt: scheduledAt?.toISOString(),
      executorId,
    });

    // Получаем задачу
    const task = await this.dl.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.type !== 'DAILY_NOTIFICATION') {
      throw new Error(`Task ${taskId} is not a DAILY_NOTIFICATION task`);
    }

    // Разрешаем редактирование пока задача не выполнена или закрыта
    if (task.status === 'DONE' || task.status === 'CANCELED') {
      throw new Error(`Task ${taskId} is already completed or canceled`);
    }

    // Парсим note с tasksList
    let taskData: any;
    try {
      taskData = JSON.parse(task.note || '{}');
    } catch (error) {
      throw new Error(`Invalid task note format: ${error instanceof Error ? error.message : String(error)}`);
    }

    const tasksList = taskData.tasks || [];
    const taskItem = tasksList.find((t: any) => 
      t.cleaningId === itemId || t.repairId === itemId
    );

    if (!taskItem) {
      throw new Error(`Task item ${itemId} not found in daily notification task`);
    }

    // Обновляем задачу
    if (scheduledAt) {
      taskItem.scheduledAt = scheduledAt.toISOString();
    }
    if (executorId !== undefined) {
      if (executorId) {
        // Определяем тип задачи для правильного обновления
        if (taskData.taskType === 'CLEANING') {
          // Для уборок сохраняем cleanerId
          taskItem.cleanerId = executorId;
          taskItem.executorId = executorId; // Сохраняем также для обратной совместимости
          
          // Загружаем имя уборщика
          try {
            const cleaner = await this.cleaningDL.getCleanerById(executorId);
            if (cleaner) {
              taskItem.executorName = `${cleaner.firstName} ${cleaner.lastName}`;
              logger.info('Cleaner name loaded', {
                executorId,
                executorName: taskItem.executorName,
              });
            } else {
              logger.warn('Cleaner not found for executorId', { executorId });
              taskItem.executorName = null;
            }
          } catch (error) {
            logger.warn('Failed to get cleaner name', {
              executorId,
              error: error instanceof Error ? error.message : String(error),
            });
            taskItem.executorName = null;
          }
        } else if (taskData.taskType === 'REPAIR') {
          // Для ремонтов сохраняем masterId
          taskItem.masterId = executorId;
          taskItem.executorId = executorId; // Сохраняем также для обратной совместимости
          
          // Загружаем имя мастера
          try {
            const master = await this.cleaningDL.getMasterById(executorId);
            if (master) {
              taskItem.executorName = `${master.firstName} ${master.lastName}`;
              logger.info('Master name loaded', {
                executorId,
                executorName: taskItem.executorName,
              });
            } else {
              logger.warn('Master not found for executorId', { executorId });
              taskItem.executorName = null;
            }
          } catch (error) {
            logger.warn('Failed to get master name', {
              executorId,
              error: error instanceof Error ? error.message : String(error),
            });
            taskItem.executorName = null;
          }
        }
      } else {
        // Если executorId пустая строка или null, удаляем исполнителя
        if (taskData.taskType === 'CLEANING') {
          taskItem.cleanerId = undefined;
        } else if (taskData.taskType === 'REPAIR') {
          taskItem.masterId = undefined;
        }
        taskItem.executorId = undefined;
        taskItem.executorName = null;
        logger.info('Executor removed from task item', { itemId });
      }
    }

    // Обновляем notes
    if (notes !== undefined) {
      taskItem.notes = notes || null;
      logger.info('Notes updated for task item', { itemId, hasNotes: !!notes });
    }

    // Обновляем templateId (только для уборок)
    if (templateId !== undefined && taskData.taskType === 'CLEANING') {
      taskItem.templateId = templateId || null;
      logger.info('Template ID updated for cleaning task item', { itemId, templateId: taskItem.templateId });
      
      // Обновляем templateId в ChecklistInstance для этой уборки
      if (taskItem.cleaningId) {
        try {
          // Обновляем ChecklistInstance.templateId для этой уборки
          await this.prisma.checklistInstance.updateMany({
            where: { cleaningId: taskItem.cleaningId },
            data: { templateId: templateId || null },
          });
          logger.info('ChecklistInstance templateId updated for cleaning', {
            cleaningId: taskItem.cleaningId,
            templateId: templateId || null,
          });
        } catch (error) {
          logger.warn('Failed to update ChecklistInstance templateId', {
            cleaningId: taskItem.cleaningId,
            templateId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      
      // Если выбран шаблон и сложность НЕ передана явно, применяем модификатор сложности
      // (если сложность передана, значит она уже была скорректирована на фронтенде)
      if (templateId && difficulty === undefined) {
        try {
          // Получаем ChecklistTemplate для модификатора сложности
          const template = await this.prisma.checklistTemplate.findUnique({
            where: { id: templateId },
          });
          if (template && (template as any).difficultyModifier !== undefined && (template as any).difficultyModifier !== null) {
            // Применяем модификатор сложности (0-5, как у уборки)
            const currentDifficulty = taskItem.difficulty !== undefined ? taskItem.difficulty : null;
            if (currentDifficulty !== null && currentDifficulty !== undefined) {
              // Если сложность уже есть, добавляем модификатор и ограничиваем 0-5
              const modifier = (template as any).difficultyModifier;
              const newDifficulty = Math.max(0, Math.min(5, currentDifficulty + modifier));
              taskItem.difficulty = newDifficulty;
              logger.info('Difficulty modifier applied', {
                itemId,
                templateId,
                modifier,
                oldDifficulty: currentDifficulty,
                newDifficulty: taskItem.difficulty,
              });
            } else {
              // Если сложность не задана, устанавливаем значение модификатора
              const modifier = (template as any).difficultyModifier;
              taskItem.difficulty = modifier;
              logger.info('Difficulty set from modifier', {
                itemId,
                templateId,
                modifier,
                difficulty: taskItem.difficulty,
              });
            }
          }
        } catch (error) {
          logger.warn('Failed to get checklist template for modifier', {
            templateId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else if (templateId && difficulty !== undefined) {
        // Если шаблон выбран и сложность передана, значит она уже скорректирована на фронтенде
        logger.info('Difficulty already adjusted on frontend, skipping modifier application', {
          itemId,
          templateId,
          difficulty,
        });
      }
    }

    // Обновляем difficulty (только для уборок)
    if (difficulty !== undefined && taskData.taskType === 'CLEANING') {
      taskItem.difficulty = difficulty >= 0 && difficulty <= 5 ? difficulty : null;
      logger.info('Difficulty updated for cleaning task item', { itemId, difficulty: taskItem.difficulty });
    }

    // Обновляем note в задаче
    taskData.tasks = tasksList;
    const updatedTask = await this.dl.updateTask(taskId, {
      note: JSON.stringify(taskData),
    });

    logger.info('Daily notification task item updated', {
      taskId,
      itemId,
    });

    return updatedTask;
  }

  /**
   * Отправить ежедневное уведомление (публикует событие и меняет статус на TODO)
   */
  async sendDailyNotificationTask(taskId: string, managerId: string) {
    logger.info('Sending daily notification task', { taskId, managerId });

    // Получаем задачу
    const task = await this.dl.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.type !== 'DAILY_NOTIFICATION') {
      throw new Error(`Task ${taskId} is not a DAILY_NOTIFICATION task`);
    }

    // Разрешаем отправку уведомлений пока задача не выполнена или закрыта
    if (task.status === 'DONE' || task.status === 'CANCELED') {
      throw new Error(`Task ${taskId} is already completed or canceled`);
    }

    // Парсим note с tasksList
    let taskData: any;
    try {
      taskData = JSON.parse(task.note || '{}');
    } catch (error) {
      throw new Error(`Invalid task note format: ${error instanceof Error ? error.message : String(error)}`);
    }

    const tasksList = taskData.tasks || [];
    const taskType = taskData.taskType === 'CLEANING'
      ? 'DAILY_CLEANING_NOTIFICATION'
      : 'DAILY_REPAIR_NOTIFICATION';

    // Определяем, кому отправлять уведомления
    // Если назначен менеджер в assignedManagerId, отправляем только ему
    // Иначе отправляем всем менеджерам организации
    let targetManagerIds: string[] = [];
    
    if (taskData.assignedManagerId) {
      // Отправляем только назначенному менеджеру
      targetManagerIds = [taskData.assignedManagerId];
      logger.info('Using assigned manager for daily notification', {
        taskId,
        assignedManagerId: taskData.assignedManagerId,
        assignedManagerName: taskData.assignedManagerName,
      });
    } else {
      // Получаем всех менеджеров организации
      const managers = await this.prisma.membership.findMany({
        where: {
          orgId: task.orgId,
          role: 'MANAGER',
        },
        select: { userId: true },
      });

      targetManagerIds = managers.map(m => m.userId).filter(Boolean) as string[];

      if (targetManagerIds.length === 0) {
        logger.warn('No managers found for organization, using actor manager only', {
          orgId: task.orgId,
          actorManagerId: managerId,
        });
        targetManagerIds.push(managerId);
      }

      logger.info('Using all managers for daily notification', {
        orgId: task.orgId,
        managersCount: targetManagerIds.length,
        managerIds: targetManagerIds,
      });
    }

    // Отправляем событие TASK_CREATED в event bus через gRPC
    // Не прерываем процесс, если events-subgraph недоступен - только логируем ошибку
    try {
      await this.eventsGrpcClient.publishEvent({
        eventType: EventsEventType.EVENT_TYPE_TASK_CREATED,
        sourceSubgraph: 'ops-subgraph',
        entityType: 'Task',
        entityId: task.id,
        orgId: task.orgId,
        actorUserId: managerId,
        targetUserIds: targetManagerIds, // Отправляем назначенному менеджеру или всем менеджерам
        payload: {
          taskId: task.id,
          taskType,
          targetDate: taskData.targetDate,
          managerId: managerId,
          orgId: task.orgId,
          tasks: tasksList,
          tasksCount: tasksList.length,
        },
      });

      logger.info('Event published for daily notification task', { 
        taskId,
        targetUserIds: targetManagerIds,
        managersCount: targetManagerIds.length,
      });
    } catch (error) {
      // Логируем ошибку, но не прерываем процесс - задача все равно должна быть отправлена
      logger.error('Failed to publish event for daily notification task (continuing anyway)', {
        taskId,
        error: error instanceof Error ? error.message : String(error),
        note: 'Task status will still be updated, but event notification may be missing',
      });
      // Не выбрасываем ошибку - продолжаем выполнение
    }

    // Меняем статус на TODO только если задача еще в DRAFT
    // Если уже в TODO или IN_PROGRESS, оставляем текущий статус
    let updatedTask = task;
    if (task.status === 'DRAFT') {
      updatedTask = await this.dl.updateTaskStatus(taskId, 'TODO');
    }

    logger.info('Daily notification task sent', { 
      taskId,
      managersNotified: targetManagerIds.length,
      targetManagerIds,
    });

    return updatedTask;
  }
}
