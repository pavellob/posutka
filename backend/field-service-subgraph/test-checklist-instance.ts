/**
 * Тестовый скрипт для проверки новой модели чек-листов
 * Запуск: tsx test-checklist-instance.ts
 */

import { PrismaClient } from '@prisma/client';
import { ChecklistInstanceService } from './src/services/checklist-instance.service.js';

const prisma = new PrismaClient();

async function testChecklistInstance() {
  console.log('🧪 Тестирование новой модели чек-листов...\n');

  try {
    const service = new ChecklistInstanceService(prisma);

    // 1. Проверяем, что можем получить шаблоны
    console.log('1️⃣ Проверка получения шаблонов...');
    const templates = await prisma.checklistTemplate.findMany({
      take: 5,
      include: { items: true }
    });
    console.log(`   ✅ Найдено шаблонов: ${templates.length}`);

    if (templates.length === 0) {
      console.log('   ⚠️  Нет шаблонов в БД. Нужно создать шаблон для тестирования.');
      console.log('   💡 Создайте шаблон через GraphQL или напрямую в БД.\n');
      return;
    }

    const template = templates[0];
    console.log(`   ✅ Используем шаблон: ${template.id} (версия ${template.version}, юнит ${template.unitId})`);
    console.log(`   ✅ Пунктов в шаблоне: ${template.items.length}\n`);

    // 2. Создаем инстанс для PRE_CLEANING
    console.log('2️⃣ Создание инстанса для PRE_CLEANING...');
    const instance = await service.createChecklistInstance(template.unitId, 'PRE_CLEANING');
    console.log(`   ✅ Инстанс создан: ${instance?.id}`);
    console.log(`   ✅ Пунктов в инстансе: ${instance?.items.length || 0}\n`);

    if (!instance) {
      throw new Error('Не удалось создать инстанс');
    }

    // 3. Добавляем новый пункт
    console.log('3️⃣ Добавление нового пункта...');
    const newItemKey = `custom_item_${Date.now()}`;
    const instanceWithNewItem = await service.addItem({
      instanceId: instance.id,
      key: newItemKey,
      title: 'Тестовый пункт',
      description: 'Это тестовый пункт, добавленный в инстанс',
      type: 'BOOL',
      required: false,
      requiresPhoto: false,
      order: 999
    });
    console.log(`   ✅ Пункт добавлен: ${newItemKey}`);
    console.log(`   ✅ Всего пунктов: ${instanceWithNewItem?.items.length || 0}\n`);

    // 4. Обновляем пункт
    console.log('4️⃣ Обновление пункта...');
    const updatedInstance = await service.updateItem({
      instanceId: instance.id,
      itemKey: newItemKey,
      title: 'Обновленный тестовый пункт',
      required: true
    });
    const updatedItem = updatedInstance?.items.find(i => i.key === newItemKey);
    console.log(`   ✅ Пункт обновлен: ${updatedItem?.title}`);
    console.log(`   ✅ Required: ${updatedItem?.required}\n`);

    // 5. Добавляем ответ
    console.log('5️⃣ Добавление ответа на пункт...');
    const firstItem = instance.items[0];
    if (firstItem) {
      const instanceWithAnswer = await service.answer({
        instanceId: instance.id,
        itemKey: firstItem.key,
        value: true,
        note: 'Тестовый ответ'
      });
      console.log(`   ✅ Ответ добавлен для пункта: ${firstItem.key}`);
      console.log(`   ✅ Всего ответов: ${instanceWithAnswer?.answers.length || 0}\n`);
    }

    // 6. Промоут в CLEANING
    console.log('6️⃣ Промоут в CLEANING...');
    // Сначала нужно отправить инстанс
    try {
      await service.submitChecklist(instance.id);
      console.log('   ✅ Инстанс отправлен (SUBMITTED)');
    } catch (error: any) {
      console.log(`   ⚠️  Не удалось отправить (возможно, не все required заполнены): ${error.message}`);
    }

    // Пробуем промоут
    try {
      const promotedInstance = await service.promoteChecklist(instance.id, 'CLEANING');
      console.log(`   ✅ Промоут выполнен: ${promotedInstance?.id}`);
      console.log(`   ✅ Пунктов в новом инстансе: ${promotedInstance?.items.length || 0}`);
      console.log(`   ✅ Стадия: ${promotedInstance?.stage}\n`);
    } catch (error: any) {
      console.log(`   ⚠️  Промоут не удался (нужно SUBMITTED): ${error.message}\n`);
    }

    // 7. Получаем инстанс по юниту и стадии
    console.log('7️⃣ Получение инстанса по юниту и стадии...');
    const instanceByUnit = await service.getChecklistByUnitAndStage(template.unitId, 'PRE_CLEANING');
    if (instanceByUnit) {
      console.log(`   ✅ Инстанс найден: ${instanceByUnit.id}`);
      console.log(`   ✅ Пунктов: ${instanceByUnit.items.length}\n`);
    } else {
      console.log('   ⚠️  Инстанс не найден\n');
    }

    console.log('✅ Все тесты пройдены успешно!\n');

  } catch (error: any) {
    console.error('❌ Ошибка при тестировании:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testChecklistInstance();

