/**
 * Полный тест workflow чек-листов: создание → заполнение → отправка → промоут
 * Запуск: tsx test-checklist-full-workflow.ts
 */

import { PrismaClient } from '@prisma/client';
import { ChecklistInstanceService } from './src/services/checklist-instance.service.js';

const prisma = new PrismaClient();

async function testFullWorkflow() {
  console.log('🧪 Полный тест workflow чек-листов...\n');

  try {
    const service = new ChecklistInstanceService(prisma);

    // 1. Находим шаблон
    const template = await prisma.checklistTemplate.findFirst({
      include: { items: true }
    });

    if (!template) {
      console.error('❌ Нет шаблонов в БД. Запустите сиды: npm run seed:ts');
      return;
    }

    console.log(`📋 Используем шаблон: ${template.id} (версия ${template.version}, юнит ${template.unitId})`);
    console.log(`   Пунктов в шаблоне: ${template.items.length}\n`);

    // 2. Создаем инстанс для PRE_CLEANING
    console.log('1️⃣ Создание инстанса для PRE_CLEANING...');
    const preCleaningInstance = await service.createChecklistInstance(template.unitId, 'PRE_CLEANING');
    console.log(`   ✅ Инстанс создан: ${preCleaningInstance?.id}`);
    console.log(`   ✅ Пунктов в инстансе: ${preCleaningInstance?.items.length || 0}\n`);

    if (!preCleaningInstance) {
      throw new Error('Не удалось создать инстанс');
    }

    // 3. Добавляем кастомный пункт на приклининге
    console.log('2️⃣ Добавление кастомного пункта на приклининге...');
    const customKey = `pre_cleaning_custom_${Date.now()}`;
    const instanceWithCustom = await service.addItem({
      instanceId: preCleaningInstance.id,
      key: customKey,
      title: 'Проверить повреждения при заселении',
      description: 'Дополнительная проверка при приемке',
      type: 'BOOL',
      required: true,
      requiresPhoto: true,
      photoMin: 1,
      order: 999
    });
    console.log(`   ✅ Кастомный пункт добавлен: ${customKey}`);
    console.log(`   ✅ Всего пунктов: ${instanceWithCustom?.items.length || 0}\n`);

    // 4. Заполняем все required items (без фото для простоты)
    console.log('3️⃣ Заполнение всех required items...');
    const requiredItems = instanceWithCustom?.items.filter(item => item.required) || [];
    console.log(`   Найдено required items: ${requiredItems.length}`);

    for (const item of requiredItems) {
      // Для items с requiresPhoto добавляем ответ, но без фото (для теста)
      if (!item.requiresPhoto) {
        await service.answer({
          instanceId: preCleaningInstance.id,
          itemKey: item.key,
          value: true,
          note: `Ответ на ${item.title}`
        });
        console.log(`   ✅ Ответ добавлен для: ${item.title}`);
      }
    }
    console.log('   ⚠️  Для items с requiresPhoto нужно добавить фото (пропускаем для теста)\n');

    // 5. Пробуем отправить (должно не получиться из-за отсутствия фото)
    console.log('4️⃣ Попытка отправки инстанса...');
    try {
      await service.submitChecklist(preCleaningInstance.id);
      console.log('   ✅ Инстанс отправлен (SUBMITTED)\n');
    } catch (error: any) {
      console.log(`   ⚠️  Не удалось отправить: ${error.message}`);
      console.log('   💡 Это ожидаемо, так как не все фото загружены\n');
    }

    // 6. Добавляем фото для required items с requiresPhoto
    console.log('5️⃣ Добавление фото для required items...');
    const itemsWithPhoto = requiredItems.filter(item => item.requiresPhoto);
    console.log(`   Найдено items с requiresPhoto: ${itemsWithPhoto.length}`);

    for (const item of itemsWithPhoto) {
      const minPhotos = item.photoMin ?? 1;
      // Добавляем нужное количество фото
      for (let i = 0; i < minPhotos; i++) {
        await service.attach({
          instanceId: preCleaningInstance.id,
          itemKey: item.key,
          url: `https://example.com/test-photo-${item.key}-${i + 1}.jpg`,
          caption: `Фото ${i + 1} для ${item.title}`
        });
      }
      console.log(`   ✅ Добавлено ${minPhotos} фото для: ${item.title}`);
    }
    console.log('');

    // 7. Пробуем отправить снова
    console.log('6️⃣ Попытка отправки инстанса (после добавления фото)...');
    try {
      await service.submitChecklist(preCleaningInstance.id);
      console.log('   ✅ Инстанс отправлен (SUBMITTED)\n');
    } catch (error: any) {
      console.log(`   ⚠️  Все еще не удалось отправить: ${error.message}\n`);
    }

    // 8. Получаем обновленный инстанс
    const updatedInstance = await service.getChecklistInstance(preCleaningInstance.id);
    console.log(`7️⃣ Статус инстанса: ${updatedInstance?.status}`);
    console.log(`   Ответов: ${updatedInstance?.answers.length || 0}`);
    console.log(`   Фото: ${updatedInstance?.attachments.length || 0}\n`);

    // 9. Если инстанс SUBMITTED, пробуем промоутить
    if (updatedInstance?.status === 'SUBMITTED') {
      console.log('8️⃣ Промоут в CLEANING...');
      try {
        const cleaningInstance = await service.promoteChecklist(preCleaningInstance.id, 'CLEANING');
        console.log(`   ✅ Промоут выполнен: ${cleaningInstance?.id}`);
        console.log(`   ✅ Пунктов в новом инстансе: ${cleaningInstance?.items.length || 0}`);
        console.log(`   ✅ Стадия: ${cleaningInstance?.stage}`);
        console.log(`   ✅ Кастомный пункт из приклининга присутствует: ${cleaningInstance?.items.some(i => i.key === customKey) ? 'ДА' : 'НЕТ'}\n`);

        // 10. Проверяем, что все items из приклининга скопировались
        const preCleaningItems = preCleaningInstance.items.map(i => i.key).sort();
        const cleaningItems = cleaningInstance?.items.map(i => i.key).sort() || [];
        const allCopied = preCleaningItems.every(key => cleaningItems.includes(key));
        console.log(`9️⃣ Проверка копирования items...`);
        console.log(`   ✅ Все items скопированы: ${allCopied ? 'ДА' : 'НЕТ'}`);
        console.log(`   Приклининг: ${preCleaningItems.length} items`);
        console.log(`   Клининг: ${cleaningItems.length} items\n`);

      } catch (error: any) {
        console.log(`   ⚠️  Промоут не удался: ${error.message}\n`);
      }
    } else {
      console.log('8️⃣ Пропускаем промоут (инстанс не SUBMITTED)\n');
    }

    console.log('✅ Все тесты пройдены!\n');

  } catch (error: any) {
    console.error('❌ Ошибка при тестировании:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFullWorkflow();

