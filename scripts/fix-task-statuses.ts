#!/usr/bin/env tsx
/**
 * Скрипт для исправления статусов задач в базе данных
 * Исправляет недопустимые статусы и приводит их к допустимым значениям
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_STATUSES = ['DRAFT', 'TODO', 'IN_PROGRESS', 'DONE', 'CANCELED'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

async function fixTaskStatuses() {
  console.log('🔍 Проверка статусов задач...');

  try {
    // Получаем все задачи
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        status: true,
        type: true,
        orgId: true,
        createdAt: true,
      },
    });

    console.log(`📊 Найдено задач: ${tasks.length}`);

    // Находим задачи с недопустимыми статусами
    const invalidTasks = tasks.filter(
      (task) => !VALID_STATUSES.includes(task.status as ValidStatus)
    );

    if (invalidTasks.length === 0) {
      console.log('✅ Все задачи имеют допустимые статусы');
      return;
    }

    console.log(`⚠️  Найдено задач с недопустимыми статусами: ${invalidTasks.length}`);

    // Показываем примеры проблемных задач
    console.log('\n📋 Примеры проблемных задач:');
    invalidTasks.slice(0, 10).forEach((task) => {
      console.log(`  - ID: ${task.id}, Статус: "${task.status}", Тип: ${task.type}, Создана: ${task.createdAt.toISOString()}`);
    });

    // Исправляем статусы
    console.log('\n🔧 Исправление статусов...');
    let fixedCount = 0;

    for (const task of invalidTasks) {
      // Преобразуем статус в строку и проверяем
      let newStatus: ValidStatus = 'TODO'; // Значение по умолчанию
      
      const statusStr = String(task.status).toUpperCase().trim();
      
      // Пытаемся найти похожий статус
      if (statusStr.includes('DRAFT')) {
        newStatus = 'DRAFT';
      } else if (statusStr.includes('TODO') || statusStr.includes('PENDING')) {
        newStatus = 'TODO';
      } else if (statusStr.includes('IN_PROGRESS') || statusStr.includes('PROGRESS')) {
        newStatus = 'IN_PROGRESS';
      } else if (statusStr.includes('DONE') || statusStr.includes('COMPLETED')) {
        newStatus = 'DONE';
      } else if (statusStr.includes('CANCELED') || statusStr.includes('CANCELLED')) {
        newStatus = 'CANCELED';
      }

      try {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: newStatus },
        });
        fixedCount++;
        console.log(`  ✅ Исправлена задача ${task.id}: "${task.status}" -> "${newStatus}"`);
      } catch (error) {
        console.error(`  ❌ Ошибка при исправлении задачи ${task.id}:`, error);
      }
    }

    console.log(`\n✅ Исправлено задач: ${fixedCount} из ${invalidTasks.length}`);

    // Проверяем результат
    const remainingInvalid = await prisma.task.findMany({
      where: {
        status: {
          notIn: VALID_STATUSES,
        },
      },
      select: { id: true, status: true },
    });

    if (remainingInvalid.length > 0) {
      console.log(`\n⚠️  Осталось задач с недопустимыми статусами: ${remainingInvalid.length}`);
      console.log('Примеры:');
      remainingInvalid.slice(0, 5).forEach((task) => {
        console.log(`  - ID: ${task.id}, Статус: "${task.status}"`);
      });
    } else {
      console.log('\n✅ Все задачи теперь имеют допустимые статусы!');
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении статусов:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем скрипт
fixTaskStatuses()
  .then(() => {
    console.log('\n🎉 Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Скрипт завершился с ошибкой:', error);
    process.exit(1);
  });

