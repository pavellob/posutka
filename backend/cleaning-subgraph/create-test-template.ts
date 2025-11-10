/**
 * Создание тестового шаблона чек-листа
 * Запуск: tsx create-test-template.ts <unitId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestTemplate(unitId?: string) {
  try {
    // Если unitId не передан, берем первый доступный юнит
    let targetUnitId = unitId;
    
    if (!targetUnitId) {
      const unit = await prisma.unit.findFirst();
      if (!unit) {
        console.error('❌ Нет юнитов в БД. Создайте юнит сначала.');
        return;
      }
      targetUnitId = unit.id;
      console.log(`📦 Используем юнит: ${targetUnitId} (${unit.name})`);
    }

    // Проверяем, есть ли уже шаблон для этого юнита
    const existingTemplate = await prisma.checklistTemplate.findFirst({
      where: { unitId: targetUnitId },
      orderBy: { version: 'desc' }
    });

    let version = 1;
    if (existingTemplate) {
      version = existingTemplate.version + 1;
      console.log(`📝 Найден существующий шаблон версии ${existingTemplate.version}, создаем версию ${version}`);
    }

    // Создаем шаблон
    const template = await prisma.checklistTemplate.create({
      data: {
        unitId: targetUnitId,
        version,
        items: {
          create: [
            {
              key: 'item_1',
              title: 'Проверить чистоту полов',
              description: 'Полы должны быть чистыми и сухими',
              type: 'BOOL',
              required: true,
              requiresPhoto: true,
              photoMin: 1,
              order: 1
            },
            {
              key: 'item_2',
              title: 'Проверить чистоту санузла',
              description: 'Санузел должен быть чистым',
              type: 'BOOL',
              required: true,
              requiresPhoto: true,
              photoMin: 2,
              order: 2
            },
            {
              key: 'item_3',
              title: 'Проверить состояние мебели',
              description: 'Мебель должна быть в хорошем состоянии',
              type: 'BOOL',
              required: false,
              requiresPhoto: false,
              order: 3
            },
            {
              key: 'item_4',
              title: 'Проверить наличие постельного белья',
              description: 'Постельное белье должно быть чистым',
              type: 'BOOL',
              required: true,
              requiresPhoto: true,
              photoMin: 1,
              order: 4
            },
            {
              key: 'item_5',
              title: 'Проверить состояние техники',
              description: 'Вся техника должна работать',
              type: 'BOOL',
              required: false,
              requiresPhoto: false,
              order: 5
            }
          ]
        }
      },
      include: { items: true }
    });

    console.log(`\n✅ Шаблон создан успешно!`);
    console.log(`   ID: ${template.id}`);
    console.log(`   Юнит: ${template.unitId}`);
    console.log(`   Версия: ${template.version}`);
    console.log(`   Пунктов: ${template.items.length}`);
    console.log(`\n📋 Пункты шаблона:`);
    template.items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.title} (${item.key})`);
      console.log(`      Тип: ${item.type}, Required: ${item.required}, Photo: ${item.requiresPhoto}`);
    });

    console.log(`\n💡 Теперь можно запустить тест: npx tsx test-checklist-instance.ts\n`);

  } catch (error: any) {
    console.error('❌ Ошибка при создании шаблона:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

const unitId = process.argv[2];
createTestTemplate(unitId);

