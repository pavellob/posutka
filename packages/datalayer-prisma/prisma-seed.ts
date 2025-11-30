// prisma-seed-mock.ts
// ESM/TypeScript seed script to populate your Prisma schema with a rich mock dataset.
// Run with: `pnpm tsx prisma-seed-mock.ts` (after `pnpm prisma db push`)

import {
  PrismaClient,
  BookingStatus,
  BookingSource,
  DepositAction,
  TransactionStatus,
  TaskStatus,
  TaskType,
  ServiceOrderStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  ListingStatus,
  Channel,
  Role,
} from '@prisma/client'

const prisma = new PrismaClient()

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function upsertUser(email: string, name: string, password: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name, password },
    create: { email, name, password },
  })
}

async function main() {
  console.log('Seeding mock data...')

  // 1) Пользователи
  const [owner, manager, staff] = await Promise.all([
    upsertUser('pavellob@gmail.com', 'Павел', '123456'),
    upsertUser('manager@example.com', 'Мария Менеджер', 'manager123'),
    upsertUser('staff@example.com', 'Саша Сотрудник', 'staff123'),
  ])

  // 2) Организация с Объектами/Юнитами
  // Используем фиксированный ID для совместимости с фронтендом
  const org = await prisma.organization.upsert({
    where: { id: 'petroga' },
    update: {},
    create: {
      id: 'petroga',
      name: 'Петрога',
      timezone: 'Europe/Moscow',
      currency: 'RUB',
      properties: {
        create: [
          {
            title: '3‑комнатная квартира — Большая Зеленина, 28, кв. 48',
            address: 'Россия, Санкт-Петербург, ул. Большая Зеленина, д. 28, кв. 48',
            amenities: [
              'wifi',
              'исторический_дом',
              '1_этаж',
              'санузлы:2',
              'спальных_мест:10',
            ],
            // Яндекс.Недвижимость поля
            propertyType: 'жилая',
            category: 'квартира',
            dealStatus: 'аренда',
            country: 'Россия',
            region: 'Санкт-Петербург',
            localityName: 'Санкт-Петербург',
            apartment: '48',
            metroName: 'Чкаловская',
            metroTimeOnFoot: 5,
            metroTimeOnTransport: 2,
            latitude: 59.9586,
            longitude: 30.3171,
            totalArea: 85.5,
            livingArea: 65.2,
            kitchenArea: 12.3,
            rooms: 3,
            roomsOffered: 3,
            floor: 1,
            floorsTotal: 5,
            buildingType: 'кирпичный',
            buildingYear: 1910,
            buildingSeries: 'дореволюционная застройка',
            elevator: false,
            parking: true,
            security: false,
            concierge: false,
            playground: true,
            gym: false,
            balcony: true,
            loggia: false,
            airConditioning: false,
            internet: true,
            washingMachine: true,
            dishwasher: false,
            tv: true,
            renovation: 'отличное',
            furniture: true,
            isElite: false,
            units: {
              create: [
                {
                  name: 'Квартира 48 — Основной юнит',
                  capacity: 10,
                  beds: 6,
                  bathrooms: 2,
                  amenities: ['wifi', 'кухня', 'стиральная_машина'],
                },
                {
                  name: 'Квартира 48 — Доп. пространство',
                  capacity: 2,
                  beds: 1,
                  bathrooms: 1,
                  amenities: ['wifi', 'диван-кровать'],
                },
              ],
            },
          },
          {
            title: '1‑комнатная студия со вторым этажом — Большая Зеленина, 28, кв. 88',
            address: 'Россия, Санкт-Петербург, ул. Большая Зеленина, д. 28, кв. 88',
            amenities: [
              'wifi',
              'отдельный_вход',
              'студия',
              'гостей:6',
              'второй_этаж_внутри',
            ],
            // Яндекс.Недвижимость поля
            propertyType: 'жилая',
            category: 'квартира',
            dealStatus: 'аренда',
            country: 'Россия',
            region: 'Санкт-Петербург',
            localityName: 'Санкт-Петербург',
            apartment: '88',
            metroName: 'Чкаловская',
            metroTimeOnFoot: 5,
            metroTimeOnTransport: 2,
            latitude: 59.9586,
            longitude: 30.3171,
            totalArea: 45.2,
            livingArea: 35.8,
            kitchenArea: 8.5,
            rooms: 1,
            roomsOffered: 1,
            floor: 2,
            floorsTotal: 5,
            buildingType: 'кирпичный',
            buildingYear: 1910,
            buildingSeries: 'дореволюционная застройка',
            elevator: false,
            parking: true,
            security: false,
            concierge: false,
            playground: true,
            gym: false,
            balcony: false,
            loggia: true,
            airConditioning: true,
            internet: true,
            washingMachine: true,
            dishwasher: true,
            tv: true,
            renovation: 'отличное',
            furniture: true,
            isElite: false,
            units: {
              create: [
                {
                  name: 'Квартира 88 — Студия-лофт',
                  capacity: 6,
                  beds: 3,
                  bathrooms: 1,
                  amenities: ['wifi', 'душ', 'отдельный_вход'],
                },
              ],
            },
          },
        ],
      },
      memberships: {
        create: [
          { user: { connect: { id: owner.id } }, role: Role.OWNER },
          { user: { connect: { id: manager.id } }, role: Role.MANAGER },
          { user: { connect: { id: staff.id } }, role: Role.STAFF },
        ],
      },
    },
    include: {
      properties: { include: { units: true } },
    },
  })

  // 3) Создаем организацию default-org для realty-calendar-adapter
  await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: {
      id: 'default-org',
      name: 'Default Organization',
      timezone: 'Europe/Moscow',
      currency: 'RUB',
    },
  })

  // Helpers
  const allUnits = org.properties.flatMap((p) => p.units)
  const unitA = allUnits[0]
  const unitB = allUnits[1]
  const unitC = allUnits[2] || allUnits[0] // если юнитов всего 3, оставим ссылку безопасной

  // 2.5) Создание дефолтных чеклистов для каждого unit
  const defaultChecklistItems = [
    { label: 'Пропылесосить и вымыть полы во всех комнатах', order: 1 },
    { label: 'Протереть пыль на всех поверхностях', order: 2 },
    { label: 'Убрать кухню (плита, раковина, столешницы)', order: 3 },
    { label: 'Убрать санузел (унитаз, раковина, душ/ванна)', order: 4 },
    { label: 'Сменить постельное белье и полотенца', order: 5 },
    { label: 'Вынести мусор', order: 6 },
    { label: 'Проверить работу техники и света', order: 7 },
    { label: 'Проветрить помещение', order: 8 },
    { label: 'Проверить наличие расходников (туалетная бумага, мыло)', order: 9 },
  ];

  await Promise.all(
    allUnits.map(unit =>
      prisma.cleaningTemplate.create({
        data: {
          unitId: unit.id,
          name: 'Стандартная уборка',
          checklistItems: {
            create: defaultChecklistItems,
          },
        },
      })
    )
  );

  console.log(`Created default cleaning templates for ${allUnits.length} units`);

  // 2.6) Создание дефолтных шаблонов чек-листов (новая модель) для каждого unit
  const defaultChecklistTemplateItems = [
    {
      key: 'item_1',
      title: 'Проверить чистоту полов',
      description: 'Полы должны быть чистыми и сухими',
      type: 'BOOL' as const,
      required: true,
      requiresPhoto: true,
      photoMin: 1,
      order: 1,
    },
    {
      key: 'item_2',
      title: 'Проверить чистоту санузла',
      description: 'Санузел должен быть чистым',
      type: 'BOOL' as const,
      required: true,
      requiresPhoto: true,
      photoMin: 2,
      order: 2,
    },
    {
      key: 'item_3',
      title: 'Проверить состояние мебели',
      description: 'Мебель должна быть в хорошем состоянии',
      type: 'BOOL' as const,
      required: false,
      requiresPhoto: false,
      order: 3,
    },
    {
      key: 'item_4',
      title: 'Проверить наличие постельного белья',
      description: 'Постельное белье должно быть чистым',
      type: 'BOOL' as const,
      required: true,
      requiresPhoto: true,
      photoMin: 1,
      order: 4,
    },
    {
      key: 'item_5',
      title: 'Проверить состояние техники',
      description: 'Вся техника должна работать',
      type: 'BOOL' as const,
      required: false,
      requiresPhoto: false,
      order: 5,
    },
    {
      key: 'item_6',
      title: 'Проверить наличие расходников',
      description: 'Туалетная бумага, мыло, полотенца',
      type: 'BOOL' as const,
      required: true,
      requiresPhoto: false,
      order: 6,
    },
    {
      key: 'item_7',
      title: 'Проверить работу света',
      description: 'Все лампы должны работать',
      type: 'BOOL' as const,
      required: false,
      requiresPhoto: false,
      order: 7,
    },
    {
      key: 'item_8',
      title: 'Проверить проветривание',
      description: 'Помещение должно быть проветрено',
      type: 'BOOL' as const,
      required: false,
      requiresPhoto: false,
      order: 8,
    },
  ];

  await Promise.all(
    allUnits.map(unit =>
      prisma.checklistTemplate.create({
        data: {
          unitId: unit.id,
          version: 1,
          items: {
            create: defaultChecklistTemplateItems,
          },
        },
      })
    )
  );

  console.log(`Created default checklist templates (v1) for ${allUnits.length} units`);

  // 3) Блокировки календаря
  await prisma.calendarBlock.createMany({
    data: [
      { unitId: unitA.id, from: daysFromNow(1), to: daysFromNow(3), note: 'Проживание владельца' },
      { unitId: unitB.id, from: daysFromNow(14), to: daysFromNow(16), note: 'Техническое обслуживание' },
    ],
  })

  // 4) Подрядчики услуг
  const [cleanCo, repairPro] = await Promise.all([
    prisma.serviceProvider.create({
      data: {
        name: 'Чисто&Чётко СПб',
        serviceTypes: ['CLEANING'],
        rating: 4.7,
        contact: '+7 921 000-00-00',
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'РемонтПро СПб',
        serviceTypes: ['MAINTENANCE'],
        rating: 4.5,
        contact: 'remont@example.com',
      },
    }),
  ])

  // 5) Объявления + скидки
  const listings = await Promise.all(
    [unitA, unitB, unitC].map((u, idx) =>
      prisma.listing.create({
        data: {
          unitId: u.id,
          status: idx === 2 ? ListingStatus.DRAFT : ListingStatus.PUBLISHED,
          channel: idx === 1 ? Channel.AIRBNB : Channel.DIRECT,
          basePriceAmount: 12000,
          basePriceCurrency: 'RUB',
          minNights: 2,
          maxNights: 14,
          discounts: {
            create: [
              { name: 'Недельная', percentOff: 10, minNights: 7 },
              { name: 'Горящее предложение', percentOff: 5 },
            ],
          },
        },
        include: { discounts: true },
      })
    )
  )

  // 6) Гости
  const guests = await prisma.$transaction([
    prisma.guest.create({
      data: { name: 'Алиса Путешественница', email: 'alice@example.com', phone: '+44 7700 900000' },
    }),
    prisma.guest.create({
      data: { name: 'Боб Номад', email: 'bob@example.com' },
    }),
    prisma.guest.create({
      data: {
        name: 'Чен Ли',
        email: 'chen@example.com',
        documentType: 'Паспорт',
        documentNumber: 'E12345678',
      },
    }),
  ])

  const [alice, bob, chen] = guests

  // 7) Бронирования с документами и транзакциями депозита
  const booking1 = await prisma.booking.create({
    data: {
      orgId: org.id,
      unitId: unitA.id,
      guestId: alice.id,
      status: BookingStatus.CONFIRMED,
      source: BookingSource.DIRECT,
      checkIn: daysFromNow(5),
      checkOut: daysFromNow(8),
      guestsCount: 2,
      basePriceAmount: 36000,
      basePriceCurrency: 'RUB',
      cleaningFeeAmount: 4000,
      cleaningFeeCurrency: 'RUB',
      serviceFeeAmount: 2000,
      serviceFeeCurrency: 'RUB',
      taxesAmount: 3000,
      taxesCurrency: 'RUB',
      totalAmount: 45000,
      totalCurrency: 'RUB',
      notes: 'Позднее прибытие ~22:00',
      documents: {
        create: [
          {
            type: 'RENTAL_AGREEMENT',
            template: 'default_agreement_v1',
            content: 'Условия и положения... (мок)'
          },
        ],
      },
      depositTransactions: {
        create: [
          {
            action: DepositAction.HOLD,
            amount: 20000,
            currency: 'RUB',
            status: TransactionStatus.COMPLETED,
            transactionId: 'psp_tx_001',
          },
        ],
      },
    },
    include: { documents: true, depositTransactions: true },
  })

  const booking2 = await prisma.booking.create({
    data: {
      orgId: org.id,
      unitId: unitB.id,
      guestId: bob.id,
      status: BookingStatus.PENDING,
      source: BookingSource.AIRBNB,
      checkIn: daysFromNow(10),
      checkOut: daysFromNow(12),
      guestsCount: 1,
      basePriceAmount: 24000,
      basePriceCurrency: 'RUB',
      totalAmount: 24000,
      totalCurrency: 'RUB',
      notes: 'Попросить ранний заезд, если возможно',
      depositTransactions: {
        create: [
          {
            action: DepositAction.HOLD,
            amount: 15000,
            currency: 'RUB',
            status: TransactionStatus.PENDING,
          },
        ],
      },
    },
    include: { depositTransactions: true },
  })

  const booking3 = await prisma.booking.create({
    data: {
      orgId: org.id,
      unitId: unitC.id,
      guestId: chen.id,
      status: BookingStatus.CANCELLED,
      source: BookingSource.DIRECT,
      checkIn: daysFromNow(-20),
      checkOut: daysFromNow(-18),
      guestsCount: 2,
      basePriceAmount: 22000,
      basePriceCurrency: 'RUB',
      totalAmount: 22000,
      totalCurrency: 'RUB',
      cancellationReason: 'Болезнь гостя',
    },
  })

  // 8) Задачи по обслуживанию + Заказы на услуги
  const [taskClean, taskFix] = await prisma.$transaction([
    prisma.task.create({
      data: {
        orgId: org.id,
        unitId: unitA.id,
        bookingId: booking1.id,
        type: TaskType.CLEANING,
        status: TaskStatus.TODO,
        dueAt: daysFromNow(9),
        assignedProviderId: cleanCo.id,
        checklist: ['Сменить бельё', 'Пропылесосить', 'Пополнить расходники'],
        note: 'VIP-гость — дополнительные полотенца',
        serviceOrders: {
          create: [
            {
              orgId: org.id,
              status: ServiceOrderStatus.ACCEPTED,
              providerId: cleanCo.id,
              costAmount: 6000,
              costCurrency: 'RUB',
              notes: 'Стандартная уборка после выезда',
            },
          ],
        },
      },
      include: { serviceOrders: true },
    }),
    prisma.task.create({
      data: {
        orgId: org.id,
        unitId: unitB.id,
        type: TaskType.MAINTENANCE,
        status: TaskStatus.IN_PROGRESS,
        dueAt: daysFromNow(15),
        assignedProviderId: repairPro.id,
        checklist: ['Исправить текущий кран', 'Проверить напор воды'],
        serviceOrders: {
          create: [
            {
              orgId: org.id,
              status: ServiceOrderStatus.CREATED,
              providerId: repairPro.id,
              notes: 'Ожидается смета',
            },
          ],
        },
      },
      include: { serviceOrders: true },
    }),
  ])

  const orderClean = taskClean.serviceOrders[0]
  const orderFix = taskFix.serviceOrders[0]

  // 9) Счета + Позиции + Платежи (линк на уборку)
  const invoice1 = await prisma.invoice.create({
    data: {
      orgId: org.id,
      orderId: orderClean.id,
      totalAmount: 6000,
      totalCurrency: 'RUB',
      status: InvoiceStatus.OPEN,
      issuedAt: daysFromNow(9),
      dueAt: daysFromNow(16),
      items: {
        create: [
          {
            name: 'Уборка после выезда',
            qty: 1,
            priceAmount: 6000,
            priceCurrency: 'RUB',
            sumAmount: 6000,
            sumCurrency: 'RUB',
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.TRANSFER,
            amountAmount: 6000,
            amountCurrency: 'RUB',
            status: PaymentStatus.PENDING,
            provider: 'ЮKassa',
          },
        ],
      },
    },
    include: { items: true, payments: true },
  })

  // 10) Юридические документы (примеры)
  await prisma.legalDocument.createMany({
    data: [
      { type: 'HOUSE_RULES', url: 'https://example.com/house-rules.pdf', bookingId: booking1.id },
      { type: 'GDPR_CONSENT', url: 'https://example.com/gdpr-consent.pdf', bookingId: booking1.id },
    ],
  })

  await prisma.legalDepositTransaction.create({
    data: {
      bookingId: booking1.id,
      holdAmount: 20000,
      holdCurrency: 'RUB',
      capturedAmount: null,
      method: 'CARD',
      status: 'HELD',
    },
  })

  console.log('Seed complete ✅')
  return {
    org,
    users: { owner, manager, staff },
    units: allUnits.length,
    listings: listings.length,
    guests: guests.length,
    bookings: [booking1, booking2, booking3].length,
    tasks: 2,
    orders: 2,
    invoiceId: invoice1.id,
  }
}

main()
  .then((summary) => console.log('Summary:', summary))
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
