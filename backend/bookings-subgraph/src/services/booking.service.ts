import { createOpsGrpcClient, OpsGrpcClient, TaskPriority } from '@repo/grpc-sdk';
import { createEventsGrpcClient, type EventsGrpcClient, EventsEventType as EventType } from '@repo/grpc-sdk';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('booking-service');

export class BookingService {
  private opsClient: OpsGrpcClient;
  private eventsClient: EventsGrpcClient | null = null;
  private identityDL: any = null;
  private prisma: any = null;

  constructor(
    private readonly dl: any,
    private readonly inventoryDL: any,
    opsGrpcHost: string,
    opsGrpcPort: number,
    eventsGrpcHost?: string,
    eventsGrpcPort?: number,
    identityDL?: any,
    prisma?: any
  ) {
    this.opsClient = createOpsGrpcClient({
      host: opsGrpcHost,
      port: opsGrpcPort,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000
    });

    // Инициализируем events client если указаны параметры
    if (eventsGrpcHost && eventsGrpcPort) {
      logger.info('Initializing events client', {
        host: eventsGrpcHost,
        port: eventsGrpcPort
      });
      this.eventsClient = createEventsGrpcClient({
        host: eventsGrpcHost,
        port: eventsGrpcPort,
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 10000,
      });
      logger.info('✅ Events client created');
    } else {
      logger.warn('⚠️ Events client not initialized - missing host or port', {
        hasHost: !!eventsGrpcHost,
        hasPort: !!eventsGrpcPort
      });
    }
    
    // Сохраняем identityDL для поиска пользователей
    this.identityDL = identityDL;
    // Сохраняем prisma для получения preferred cleaners
    this.prisma = prisma;
  }

  async initialize(): Promise<void> {
    await this.opsClient.connect();
    if (this.eventsClient) {
      try {
        await this.eventsClient.connect();
        logger.info('✅ Events client connected successfully', {
          isHealthy: this.eventsClient.isHealthy()
        });
      } catch (error: any) {
        logger.error('❌ Failed to connect to events-subgraph gRPC', { 
          error: error.message,
          stack: error.stack
        });
      }
    } else {
      logger.warn('⚠️ Events client not initialized', {
        hint: 'EVENTS_GRPC_HOST and EVENTS_GRPC_PORT must be provided to publish events'
      });
    }
  }

  async createBooking(bookingData: any): Promise<any> {
    try {
      logger.info('Creating booking', { bookingData });

      // Преобразуем запрос в формат datalayer
      // Если передан guestId и guestName, но нет объекта guest, создаем его
      // Преобразуем даты: если Date - конвертируем в ISO строку, иначе оставляем как есть
      const checkInDate = bookingData.checkIn instanceof Date 
        ? bookingData.checkIn.toISOString()
        : (bookingData.checkIn && typeof bookingData.checkIn === 'object' && typeof bookingData.checkIn.toISOString === 'function'
          ? (bookingData.checkIn as Date).toISOString()
          : bookingData.checkIn);
      
      const checkOutDate = bookingData.checkOut instanceof Date 
        ? bookingData.checkOut.toISOString()
        : (bookingData.checkOut && typeof bookingData.checkOut === 'object' && typeof bookingData.checkOut.toISOString === 'function'
          ? (bookingData.checkOut as Date).toISOString()
          : bookingData.checkOut);

      const createBookingInput: any = {
        orgId: bookingData.orgId,
        unitId: bookingData.unitId,
        propertyId: bookingData.propertyId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guestsCount: bookingData.guestsCount || 1,
        priceBreakdown: bookingData.priceBreakdown || {
          basePrice: {
            amount: bookingData.basePriceAmount || 0,
            currency: bookingData.basePriceCurrency || 'RUB',
          },
          total: {
            amount: bookingData.totalAmount || bookingData.basePriceAmount || 0,
            currency: bookingData.totalCurrency || bookingData.basePriceCurrency || 'RUB',
          },
        },
        notes: bookingData.notes,
        source: bookingData.source || 'DIRECT',
        externalSource: bookingData.externalSource,
        externalId: bookingData.externalId,
        // Создаем объект guest из доступных данных
        guest: bookingData.guest || {
          name: bookingData.guestName || 'Гость',
          email: bookingData.guestEmail || `guest_${bookingData.guestId}@temp.local`,
          phone: bookingData.guestPhone,
        },
      };

      // Создаем бронирование
      const booking = await this.dl.createBooking(createBookingInput);

      // Получаем полную информацию о госте и объекте для события
      let guest: any = null;
      try {
        guest = await this.dl.getGuestById(booking.guestId);
        logger.debug('Guest retrieved', {
          bookingId: booking.id,
          guestId: booking.guestId,
          hasGuest: !!guest,
          guestEmail: guest?.email,
        });
      } catch (guestError: any) {
        logger.warn('Failed to get guest', {
          bookingId: booking.id,
          guestId: booking.guestId,
          error: guestError.message,
        });
        guest = null;
      }
      
      // Если гость не найден, логируем предупреждение (бронирование уже создано)
      if (!guest) {
        logger.warn('Guest not found after booking creation', {
          bookingId: booking.id,
          guestId: booking.guestId,
          hint: 'Guest may need to be created before booking creation'
        });
      }
      
      const unit = await this.inventoryDL.getUnitById(booking.unitId);
      const property = unit ? await this.inventoryDL.getPropertyById(unit.propertyId) : null;

      // Создаем задачу на уборку (не блокируем публикацию события при ошибке)
      try {
        await this.createCleaningTask(booking);
        logger.info('✅ Cleaning task created', { bookingId: booking.id });
      } catch (cleaningTaskError: any) {
        logger.warn('⚠️ Failed to create cleaning task, continuing with booking creation', {
          bookingId: booking.id,
          error: cleaningTaskError.message,
        });
        // Не прерываем создание бронирования, если задача на уборку не создалась
      }

      // Публикуем событие BOOKING_CREATED (всегда, даже если задача на уборку не создалась)
      logger.info('📤 About to publish BOOKING_CREATED event', {
        bookingId: booking.id,
        hasEventsClient: !!this.eventsClient,
        eventsClientHealthy: this.eventsClient?.isHealthy() || false,
        hasGuest: !!guest,
        hasUnit: !!unit,
        hasProperty: !!property,
        orgId: bookingData.orgId || booking.orgId,
      });
      
      try {
        await this.publishBookingCreatedEvent(booking, guest, unit, property, bookingData.orgId);
        logger.info('✅ BOOKING_CREATED event publication completed', { bookingId: booking.id });
      } catch (eventError: any) {
        logger.error('❌ Failed to publish BOOKING_CREATED event', {
          bookingId: booking.id,
          error: eventError.message,
          stack: eventError.stack,
          hint: 'Booking was created but event was not published. Check events-subgraph connection.'
        });
        // Не прерываем создание бронирования, если событие не опубликовалось
      }

      logger.info('Booking created successfully', { bookingId: booking.id });
      return booking;
    } catch (error: any) {
      logger.error('Failed to create booking', { error: error.message });
      throw error;
    }
  }

  private async createCleaningTask(booking: any): Promise<void> {
    try {
      // Вычисляем время для уборки (за 2 часа до заезда)
      const scheduledAt = new Date(booking.checkIn);
      scheduledAt.setHours(scheduledAt.getHours() - 2);

      // Get unit to extract propertyId
      const unit = await this.inventoryDL.getUnitById(booking.unitId);
      if (!unit) {
        logger.error('Unit not found, cannot create cleaning task', { 
          unitId: booking.unitId,
          bookingId: booking.id 
        });
        return;
      }

      const request = {
        orgId: booking.orgId, // Use orgId from booking
        propertyId: unit.propertyId, // Get from unit
        roomId: booking.unitId, // Use unitId as roomId
        bookingId: booking.id,
        scheduledAt,
        notes: `Уборка для бронирования ${booking.id}. Гость: ${booking.guestId}`,
        priority: TaskPriority.TASK_PRIORITY_MEDIUM
      };

      logger.info('Creating cleaning task', { 
        bookingId: booking.id,
        orgId: booking.orgId,
        unitId: booking.unitId,
        propertyId: unit.propertyId,
        scheduledAt: scheduledAt.toISOString()
      });

      const response = await this.opsClient.createCleaningTask(request);

      if (!response.success) {
        logger.error('Failed to create cleaning task', { 
          bookingId: booking.id,
          error: response.message 
        });
      } else {
        logger.info('Cleaning task created successfully', { 
          bookingId: booking.id,
          taskId: response.task?.id
        });
      }
    } catch (error: any) {
      logger.error('Failed to create cleaning task', { 
        bookingId: booking.id,
        error: error.message 
      });
    }
  }

  async getBookingById(id: string): Promise<any> {
    try {
      logger.info('Getting booking by ID', { id });
      
      // Пока что симулируем получение бронирования
      // В реальной реализации здесь будет this.dl.getBookingById(id)
      return {
        id,
        orgId: '123e4567-e89b-12d3-a456-426614174000',
        unitId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        roomId: '123e4567-e89b-12d3-a456-426614174001',
        guestName: 'Test Guest',
        checkIn: '2024-01-01T14:00:00Z',
        checkOut: '2024-01-03T11:00:00Z',
        guestsCount: 2,
        status: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to get booking', { error: error.message });
      throw error;
    }
  }

  async cancelBooking(id: string, reason?: string): Promise<any> {
    try {
      logger.info('Cancelling booking', { id, reason });
      
      // Отменяем бронирование через datalayer
      const booking = await this.dl.cancelBooking(id, reason);
      
      logger.info('Booking cancelled successfully', {
        bookingId: booking.id,
        cancellationReason: booking.cancellationReason,
      });

      // Публикуем событие BOOKING_CANCELLED (не блокируем отмену при ошибке)
      try {
        await this.publishBookingCancelledEvent(booking, reason);
        logger.info('✅ BOOKING_CANCELLED event published', { bookingId: booking.id });
      } catch (eventError: any) {
        logger.warn('⚠️ Failed to publish BOOKING_CANCELLED event, continuing with cancellation', {
          bookingId: booking.id,
          error: eventError.message,
        });
        // Не прерываем отмену, если событие не опубликовалось
      }
      
      return booking;
    } catch (error: any) {
      logger.error('Failed to cancel booking', { error: error.message, id, reason });
      throw error;
    }
  }

  async changeBookingDates(id: string, checkIn: string, checkOut: string): Promise<any> {
    try {
      logger.info('Changing booking dates', { id, checkIn, checkOut });
      
      // Пока что симулируем изменение дат бронирования
      // В реальной реализации здесь будет this.dl.changeBookingDates(id, checkIn, checkOut)
      return {
        id,
        orgId: '123e4567-e89b-12d3-a456-426614174000',
        unitId: '123e4567-e89b-12d3-a456-426614174001',
        propertyId: '123e4567-e89b-12d3-a456-426614174001',
        roomId: '123e4567-e89b-12d3-a456-426614174001',
        guestName: 'Test Guest',
        checkIn,
        checkOut,
        guestsCount: 2,
        status: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Failed to change booking dates', { error: error.message });
      throw error;
    }
  }

  /**
   * Публикует событие BOOKING_CREATED через event bus
   */
  private async publishBookingCreatedEvent(
    booking: any,
    guest: any,
    unit: any,
    property: any,
    orgId?: string
  ): Promise<void> {
    logger.info('🔔 publishBookingCreatedEvent called', {
      bookingId: booking?.id,
      hasGuest: !!guest,
      hasUnit: !!unit,
      hasProperty: !!property,
      orgId: orgId || booking?.orgId,
      eventsClientExists: !!this.eventsClient,
    });

    if (!this.eventsClient) {
      logger.error('❌ Events client not initialized, cannot publish BOOKING_CREATED event', {
        bookingId: booking.id,
        hint: 'Check EVENTS_GRPC_HOST and EVENTS_GRPC_PORT environment variables'
      });
      return;
    }

    // Проверяем подключение
    if (!this.eventsClient.isHealthy()) {
      logger.warn('⚠️ Events client not connected, attempting to connect...', {
        bookingId: booking.id,
      });
      try {
        await this.eventsClient.connect();
        logger.info('✅ Events client connected successfully');
      } catch (connectError: any) {
        logger.error('❌ Failed to connect events client', {
          bookingId: booking.id,
          error: connectError.message,
        });
        return;
      }
    }

    try {
      // Вычисляем код от замка (последние 4 цифры телефона гостя)
      let lockCode: string | undefined = undefined;
      if (guest?.phone) {
        const phoneDigits = guest.phone.replace(/\D/g, ''); // Убираем все нецифровые символы
        if (phoneDigits.length >= 4) {
          lockCode = phoneDigits.slice(-4);
        }
      }

      // Формируем адрес
      const unitAddress = property?.address || unit?.name || 'Адрес не указан';

      // Определяем targetUserIds
      const targetUserIds: string[] = [];
      
      // 1. Пытаемся найти пользователя по email гостя
      if (guest && guest.email && this.identityDL) {
        try {
          const guestEmail = guest.email; // Сохраняем в переменную для безопасности
          const user = await this.identityDL.getUserByEmail(guestEmail);
          if (user?.id) {
            targetUserIds.push(user.id);
            logger.info('Found user for guest email', {
              guestEmail: guestEmail,
              userId: user.id,
            });
          }
        } catch (error: any) {
          logger.warn('Failed to find user by guest email', {
            guestEmail: guest?.email,
            error: error.message,
          });
        }
      } else {
        logger.debug('Skipping user lookup by email', {
          hasGuest: !!guest,
          hasGuestEmail: !!(guest && guest.email),
          hasIdentityDL: !!this.identityDL,
        });
      }
      
      // 2. Добавляем менеджеров организации, чтобы уведомление было отправлено даже если гость не зарегистрирован
      const finalOrgId = orgId || booking.orgId;
      if (finalOrgId && this.identityDL) {
        try {
          const memberships = await this.identityDL.getMembershipsByOrg(finalOrgId);
          const managerUserIds = memberships
            .filter((m: any) => m.role === 'MANAGER' || m.role === 'OWNER')
            .map((m: any) => m.userId);
          
          managerUserIds.forEach((userId: string) => {
            if (!targetUserIds.includes(userId)) {
              targetUserIds.push(userId);
            }
          });
          
          if (managerUserIds.length > 0) {
            logger.info('Added organization managers to targetUserIds', {
              orgId: finalOrgId,
              managerCount: managerUserIds.length,
              managerUserIds,
            });
          } else {
            logger.warn('No managers found for organization', {
              orgId: finalOrgId,
            });
          }
        } catch (error: any) {
          logger.warn('Failed to get organization managers', {
            orgId: finalOrgId,
            error: error.message,
          });
        }
      }
      
      // 3. Добавляем preferred cleaners для этого unit
      if (booking.unitId && this.prisma) {
        try {
          const preferredCleaners = await this.prisma.unitPreferredCleaner.findMany({
            where: { unitId: booking.unitId },
            include: {
              cleaner: {
                select: {
                  id: true,
                  userId: true,
                  isActive: true,
                }
              }
            }
          });
          
          const cleanerUserIds = preferredCleaners
            .filter((pref: any) => pref.cleaner?.isActive && pref.cleaner?.userId)
            .map((pref: any) => pref.cleaner.userId);
          
          cleanerUserIds.forEach((userId: string) => {
            if (!targetUserIds.includes(userId)) {
              targetUserIds.push(userId);
            }
          });
          
          if (cleanerUserIds.length > 0) {
            logger.info('Added preferred cleaners to targetUserIds', {
              unitId: booking.unitId,
              cleanerCount: cleanerUserIds.length,
              cleanerUserIds,
            });
          } else {
            logger.debug('No active preferred cleaners found for unit', {
              unitId: booking.unitId,
            });
          }
        } catch (error: any) {
          logger.warn('Failed to get preferred cleaners for unit', {
            unitId: booking.unitId,
            error: error.message,
          });
        }
      }
      
      if (targetUserIds.length === 0) {
        logger.warn('⚠️ No target users found for BOOKING_CREATED event', {
          bookingId: booking.id,
          guestEmail: guest?.email,
          orgId: finalOrgId,
          hint: 'Notification will not be sent. Ensure guest is registered or organization has managers.',
        });
      }

      const payload = {
        bookingId: booking.id,
        guestId: booking.guestId,
        guestName: guest?.name || 'Гость',
        guestPhone: guest?.phone || undefined,
        guestEmail: guest?.email || undefined,
        unitId: booking.unitId,
        unitName: unit?.name || 'Квартира',
        unitAddress: unitAddress,
        propertyId: property?.id || unit?.propertyId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guestsCount: booking.guestsCount,
        lockCode: lockCode, // Код от замка (последние 4 цифры телефона)
        houseRules: undefined, // Правила проживания - можно добавить позже, если будут храниться в БД
        checkInInstructions: unit?.checkInInstructions || undefined, // Инструкция по заселению для гостя
        priceBreakdown: {
          basePrice: {
            amount: booking.basePriceAmount,
            currency: booking.basePriceCurrency,
          },
          total: {
            amount: booking.totalAmount,
            currency: booking.totalCurrency,
          },
        },
      };

      logger.info('📤 Publishing BOOKING_CREATED event', {
        bookingId: booking.id,
        guestName: payload.guestName,
        hasLockCode: !!lockCode,
        lockCode: lockCode,
        targetUserIdsCount: targetUserIds.length,
        targetUserIds: targetUserIds,
        orgId: orgId || booking.orgId,
        payloadKeys: Object.keys(payload),
        eventsClientExists: !!this.eventsClient,
        eventsClientHealthy: this.eventsClient?.isHealthy() || false,
        eventTypeValue: EventType.EVENT_TYPE_BOOKING_CREATED,
        fullPayload: JSON.stringify(payload, null, 2),
      });

      // Публикуем событие даже если targetUserIds пустой (для логирования и аудита)
      // Но уведомление не будет создано, если нет получателей
      if (!this.eventsClient) {
        logger.error('❌ Cannot publish BOOKING_CREATED - eventsClient is null', {
          bookingId: booking.id,
          hint: 'Events client was not initialized. Check EVENTS_GRPC_HOST and EVENTS_GRPC_PORT environment variables.'
        });
        return;
      }

      if (!this.eventsClient.isHealthy()) {
        logger.warn('⚠️ Events client not healthy, attempting to reconnect...', {
          bookingId: booking.id,
        });
        try {
          await this.eventsClient.connect();
          logger.info('✅ Events client reconnected');
        } catch (reconnectError: any) {
          logger.error('❌ Failed to reconnect events client', {
            bookingId: booking.id,
            error: reconnectError.message,
          });
          return;
        }
      }

      try {
        const eventTypeValue = EventType.EVENT_TYPE_BOOKING_CREATED;
        logger.info('📤 Calling publishEvent with eventType', {
          bookingId: booking.id,
          eventTypeValue,
          eventTypeName: EventType[eventTypeValue],
        });

        const result = await this.eventsClient.publishEvent({
          eventType: eventTypeValue,
          sourceSubgraph: 'bookings-subgraph',
          entityType: 'Booking',
          entityId: booking.id,
          orgId: orgId || booking.orgId,
          targetUserIds,
          payload,
        });

        logger.info('✅ BOOKING_CREATED event published to gRPC', {
          bookingId: booking.id,
          result: result,
        });
      } catch (publishError: any) {
        logger.error('❌ Failed to publish BOOKING_CREATED event', {
          bookingId: booking.id,
          error: publishError.message,
          stack: publishError.stack,
        });
        throw publishError;
      }

      if (targetUserIds.length > 0) {
        logger.info('✅ BOOKING_CREATED event published successfully', { 
          bookingId: booking.id,
          targetUserIdsCount: targetUserIds.length,
          targetUserIds 
        });
      } else {
        logger.warn('⚠️ BOOKING_CREATED event published but no target users', { 
          bookingId: booking.id,
          hint: 'Event was published but notification will not be created without targetUserIds'
        });
      }
    } catch (error: any) {
      logger.error('Failed to publish BOOKING_CREATED event', {
        error: error.message,
        bookingId: booking.id,
      });
      // Не прерываем создание бронирования, если событие не опубликовалось
    }
  }

  private async publishBookingCancelledEvent(
    booking: any,
    cancellationReason?: string
  ): Promise<void> {
    logger.info('🔔 publishBookingCancelledEvent called', {
      bookingId: booking?.id,
      cancellationReason,
      eventsClientExists: !!this.eventsClient,
    });

    if (!this.eventsClient) {
      logger.error('❌ Events client not initialized, cannot publish BOOKING_CANCELLED event', {
        bookingId: booking.id,
        hint: 'Check EVENTS_GRPC_HOST and EVENTS_GRPC_PORT environment variables'
      });
      return;
    }

    // Проверяем подключение
    if (!this.eventsClient.isHealthy()) {
      logger.warn('⚠️ Events client not connected, attempting to connect...', {
        bookingId: booking.id,
      });
      try {
        await this.eventsClient.connect();
        logger.info('✅ Events client connected successfully');
      } catch (connectError: any) {
        logger.error('❌ Failed to connect events client', {
          bookingId: booking.id,
          error: connectError.message,
        });
        return;
      }
    }

    try {
      // Получаем информацию о госте, unit и property
      let guest: any = null;
      let unit: any = null;
      let property: any = null;

      try {
        guest = await this.dl.getGuestById(booking.guestId);
      } catch (error: any) {
        logger.warn('Failed to get guest for BOOKING_CANCELLED event', {
          bookingId: booking.id,
          guestId: booking.guestId,
          error: error.message,
        });
      }

      if (booking.unitId && this.inventoryDL) {
        try {
          unit = await this.inventoryDL.getUnitById(booking.unitId);
          if (unit?.propertyId) {
            property = await this.inventoryDL.getPropertyById(unit.propertyId);
          }
        } catch (error: any) {
          logger.warn('Failed to get unit/property for BOOKING_CANCELLED event', {
            bookingId: booking.id,
            unitId: booking.unitId,
            error: error.message,
          });
        }
      }

      // Формируем адрес
      const unitAddress = property?.address || unit?.name || 'Адрес не указан';

      // Определяем targetUserIds
      const targetUserIds: string[] = [];
      
      // 1. Пытаемся найти пользователя по email гостя
      if (guest && guest.email && this.identityDL) {
        try {
          const user = await this.identityDL.getUserByEmail(guest.email);
          if (user?.id) {
            targetUserIds.push(user.id);
            logger.info('Found user for guest email', {
              guestEmail: guest.email,
              userId: user.id,
            });
          }
        } catch (error: any) {
          logger.warn('Failed to find user by guest email', {
            guestEmail: guest?.email,
            error: error.message,
          });
        }
      }
      
      // 2. Добавляем менеджеров организации
      if (booking.orgId && this.identityDL) {
        try {
          const memberships = await this.identityDL.getMembershipsByOrg(booking.orgId);
          const managerUserIds = memberships
            .filter((m: any) => m.role === 'MANAGER' || m.role === 'OWNER')
            .map((m: any) => m.userId);
          
          managerUserIds.forEach((userId: string) => {
            if (!targetUserIds.includes(userId)) {
              targetUserIds.push(userId);
            }
          });
          
          if (managerUserIds.length > 0) {
            logger.info('Added organization managers to targetUserIds', {
              orgId: booking.orgId,
              managerCount: managerUserIds.length,
            });
          }
        } catch (error: any) {
          logger.warn('Failed to get organization managers', {
            orgId: booking.orgId,
            error: error.message,
          });
        }
      }

      if (targetUserIds.length === 0) {
        logger.warn('⚠️ No target users found for BOOKING_CANCELLED event', {
          bookingId: booking.id,
          guestEmail: guest?.email,
          orgId: booking.orgId,
        });
      }

      const payload = {
        bookingId: booking.id,
        guestId: booking.guestId,
        guestName: guest?.name || 'Гость',
        guestPhone: guest?.phone || undefined,
        guestEmail: guest?.email || undefined,
        unitId: booking.unitId,
        unitName: unit?.name || 'Квартира',
        unitAddress: unitAddress,
        propertyId: property?.id || unit?.propertyId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        cancellationReason: cancellationReason || booking.cancellationReason,
      };

      logger.info('📤 Publishing BOOKING_CANCELLED event', {
        bookingId: booking.id,
        guestName: payload.guestName,
        targetUserIdsCount: targetUserIds.length,
        targetUserIds: targetUserIds,
        orgId: booking.orgId,
      });

      const result = await this.eventsClient.publishEvent({
        eventType: EventType.EVENT_TYPE_BOOKING_CANCELLED,
        sourceSubgraph: 'bookings-subgraph',
        entityType: 'Booking',
        entityId: booking.id,
        orgId: booking.orgId,
        targetUserIds,
        payload,
      });

      logger.info('✅ BOOKING_CANCELLED event published to gRPC', {
        bookingId: booking.id,
        result: result,
      });

      if (targetUserIds.length > 0) {
        logger.info('✅ BOOKING_CANCELLED event published successfully', { 
          bookingId: booking.id,
          targetUserIdsCount: targetUserIds.length,
          targetUserIds 
        });
      } else {
        logger.warn('⚠️ BOOKING_CANCELLED event published but no target users', { 
          bookingId: booking.id,
        });
      }
    } catch (error: any) {
      logger.error('Failed to publish BOOKING_CANCELLED event', {
        error: error.message,
        bookingId: booking.id,
      });
      // Не прерываем отмену, если событие не опубликовалось
    }
  }

  async getBookingByExternalRef(externalSource: string, externalId: string): Promise<any | null> {
    try {
      logger.info('Getting booking by externalRef', { externalSource, externalId });
      
      // Используем метод datalayer для поиска по externalRef
      const booking = await this.dl.getBookingByExternalRef(externalSource, externalId);
      
      if (!booking) {
        logger.info('Booking not found by externalRef', { externalSource, externalId });
        return null;
      }
      
      logger.info('Booking found by externalRef', {
        bookingId: booking.id,
        externalSource,
        externalId,
      });
      
      return booking;
    } catch (error: any) {
      logger.error('Failed to get booking by externalRef', { error: error.message });
      throw error;
    }
  }

  async updateBooking(request: {
    id: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    checkIn?: Date;
    checkOut?: Date;
    guestsCount?: number;
    status?: any;
    notes?: string;
  }): Promise<any> {
    try {
      logger.info('Updating booking', { request });
      
      // Получаем текущую бронь
      const existing = await this.dl.getBookingById(request.id);
      if (!existing) {
        throw new Error('Booking not found');
      }
      
      // Обновляем данные гостя, если переданы
      if (request.guestName || request.guestEmail || request.guestPhone) {
        const guest = await this.dl.getGuestById(existing.guestId);
        if (guest) {
          await this.dl.upsertGuest({
            name: request.guestName || guest.name,
            email: request.guestEmail || guest.email,
            phone: request.guestPhone || guest.phone,
          });
        }
      }
      
      // Обновляем даты, если переданы
      let updatedBooking = existing;
      if (request.checkIn && request.checkOut) {
        updatedBooking = await this.dl.changeBookingDates(
          request.id,
          request.checkIn.toISOString(),
          request.checkOut.toISOString()
        );
      }
      
      // TODO: Добавить метод updateBooking в datalayer для обновления других полей (notes, guestsCount, status)
      // Пока возвращаем обновленную бронь
      return updatedBooking;
    } catch (error: any) {
      logger.error('Failed to update booking', { error: error.message });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await this.opsClient.disconnect();
    if (this.eventsClient) {
      await this.eventsClient.disconnect().catch((error) => {
        logger.warn('Failed to disconnect events client', { error });
      });
    }
  }
}
