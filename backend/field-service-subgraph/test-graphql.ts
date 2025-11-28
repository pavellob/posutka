/**
 * Тест GraphQL API для новой модели чек-листов
 * Запуск: tsx test-graphql.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testGraphQL() {
  console.log('🧪 Тестирование GraphQL API...\n');

  try {
    // 1. Получаем юнит с шаблоном
    const unit = await prisma.unit.findFirst({
      include: {
        checklistTemplates: {
          include: { items: true },
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!unit) {
      console.error('❌ Нет юнитов в БД');
      return;
    }

    const template = unit.checklistTemplates[0];
    if (!template) {
      console.error('❌ Нет шаблонов для юнита');
      return;
    }

    console.log(`📋 Юнит: ${unit.id}`);
    console.log(`📋 Шаблон: ${template.id} (версия ${template.version})`);
    console.log(`📋 Пунктов в шаблоне: ${template.items.length}\n`);

    // 2. Проверяем GraphQL запросы (примеры)
    console.log('📝 Примеры GraphQL запросов:\n');

    console.log('1️⃣ Создание инстанса для PRE_CLEANING:');
    console.log(`
mutation {
  createChecklistInstance(unitId: "${unit.id}", stage: PRE_CLEANING) {
    id
    stage
    status
    items {
      key
      title
      type
      required
      requiresPhoto
    }
  }
}
    `);

    console.log('2️⃣ Добавление кастомного пункта:');
    console.log(`
mutation {
  addItem(input: {
    instanceId: "<INSTANCE_ID>"
    key: "custom_item_1"
    title: "Проверить повреждения"
    description: "Дополнительная проверка"
    type: BOOL
    required: true
    requiresPhoto: true
    photoMin: 1
    order: 999
  }) {
    id
    items {
      key
      title
    }
  }
}
    `);

    console.log('3️⃣ Получение инстанса по юниту и стадии:');
    console.log(`
query {
  checklistByUnitAndStage(unitId: "${unit.id}", stage: PRE_CLEANING) {
    id
    stage
    status
    items {
      key
      title
      required
      requiresPhoto
    }
    answers {
      itemKey
      value
      note
    }
    attachments {
      itemKey
      url
      caption
    }
  }
}
    `);

    console.log('4️⃣ Промоут в CLEANING:');
    console.log(`
mutation {
  promoteChecklist(fromInstanceId: "<PRE_CLEANING_INSTANCE_ID>", toStage: CLEANING) {
    id
    stage
    status
    parentInstanceId
    items {
      key
      title
    }
  }
}
    `);

    console.log('5️⃣ Отправка чек-листа:');
    console.log(`
mutation {
  submitChecklist(id: "<INSTANCE_ID>") {
    id
    status
  }
}
    `);

    console.log('6️⃣ Добавление ответа:');
    console.log(`
mutation {
  answer(input: {
    instanceId: "<INSTANCE_ID>"
    itemKey: "item_1"
    value: true
    note: "Все чисто"
  }) {
    id
    answers {
      itemKey
      value
      note
    }
  }
}
    `);

    console.log('7️⃣ Добавление фото:');
    console.log(`
mutation {
  attach(input: {
    instanceId: "<INSTANCE_ID>"
    itemKey: "item_1"
    url: "https://minio.example.com/bucket/photo.jpg"
    caption: "Фото пола"
  }) {
    id
    attachments {
      itemKey
      url
      caption
    }
  }
}
    `);

    console.log('✅ Примеры GraphQL запросов готовы!\n');
    console.log('💡 Запустите сервер и протестируйте через GraphQL Playground\n');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testGraphQL();

