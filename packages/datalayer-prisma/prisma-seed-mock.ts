// prisma-seed-mock.ts
// ESM/TypeScript seed script to populate your Prisma schema with a rich mock dataset.
// Run with: `pnpm tsx prisma-seed-mock.ts` (after `pnpm prisma db push`)

import { PrismaClient, BookingStatus, BookingSource, DepositAction, TransactionStatus, TaskStatus, TaskType, ServiceOrderStatus, InvoiceStatus, PaymentMethod, PaymentStatus, ListingStatus, Channel, Role } from '@prisma/client'

const prisma = new PrismaClient()

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function upsertUser(email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  })
}

async function main() {
  console.log('Seeding mock data...')

  // 1) Users
  const [owner, manager, staff] = await Promise.all([
    upsertUser('owner@example.com', 'Olga Owner'),
    upsertUser('manager@example.com', 'Max Manager'),
    upsertUser('staff@example.com', 'Sasha Staff'),
  ])

  // 2) Organization with Properties/Units
  const org = await prisma.organization.create({
    data: {
      name: 'Sunrise Stays B.V.',
      timezone: 'Europe/Amsterdam',
      currency: 'EUR',
      properties: {
        create: [
          {
            title: 'Canal View Apartments',
            address: 'Keizersgracht 123, Amsterdam',
            amenities: ['wifi', 'elevator', 'heating'],
            units: {
              create: [
                {
                  name: 'Apt 1A',
                  capacity: 4,
                  beds: 2,
                  bathrooms: 1,
                  amenities: ['wifi', 'kitchen', 'washer'],
                },
                {
                  name: 'Apt 2B',
                  capacity: 2,
                  beds: 1,
                  bathrooms: 1,
                  amenities: ['wifi', 'balcony'],
                },
              ],
            },
          },
          {
            title: 'Harbor Loft Studios',
            address: 'Piet Heinkade 80, Amsterdam',
            amenities: ['wifi', 'self_checkin', 'air_conditioning'],
            units: {
              create: [
                {
                  name: 'Studio 301',
                  capacity: 2,
                  beds: 1,
                  bathrooms: 1,
                  amenities: ['wifi', 'coffee_machine'],
                },
                {
                  name: 'Studio 305',
                  capacity: 3,
                  beds: 2,
                  bathrooms: 1,
                  amenities: ['wifi', 'crib', 'tv'],
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

  // Helpers
  const allUnits = org.properties.flatMap((p) => p.units)
  const unitA = allUnits[0]
  const unitB = allUnits[1]
  const unitC = allUnits[2]

  // 3) Calendar blocks
  await prisma.calendarBlock.createMany({
    data: [
      { unitId: unitA.id, from: daysFromNow(1), to: daysFromNow(3), note: 'Owner stay' },
      { unitId: unitB.id, from: daysFromNow(14), to: daysFromNow(16), note: 'Maintenance' },
    ],
  })

  // 4) Service Providers
  const [cleanCo, repairPro] = await Promise.all([
    prisma.serviceProvider.create({
      data: {
        name: 'CleanCo NL',
        serviceTypes: ['CLEANING'],
        rating: 4.7,
        contact: '+31 6 1111 2222',
      },
    }),
    prisma.serviceProvider.create({
      data: {
        name: 'RepairPro Amsterdam',
        serviceTypes: ['MAINTENANCE'],
        rating: 4.5,
        contact: 'repairs@example.com',
      },
    }),
  ])

  // 5) Listings + Discounts
  const listings = await Promise.all(
    [unitA, unitB, unitC].map((u, idx) =>
      prisma.listing.create({
        data: {
          unitId: u.id,
          status: idx === 2 ? ListingStatus.DRAFT : ListingStatus.PUBLISHED,
          channel: idx === 1 ? Channel.AIRBNB : Channel.DIRECT,
          basePriceAmount: 12000,
          basePriceCurrency: 'EUR',
          minNights: 2,
          maxNights: 14,
          discounts: {
            create: [
              { name: 'Weekly', percentOff: 10, minNights: 7 },
              { name: 'Last Minute', percentOff: 5 },
            ],
          },
        },
        include: { discounts: true },
      })
    )
  )

  // 6) Guests
  const guests = await prisma.$transaction([
    prisma.guest.create({
      data: { name: 'Alice Traveller', email: 'alice@example.com', phone: '+44 7700 900000' },
    }),
    prisma.guest.create({
      data: { name: 'Bob Nomad', email: 'bob@example.com' },
    }),
    prisma.guest.create({
      data: {
        name: 'Chen Li',
        email: 'chen@example.com',
        documentType: 'Passport',
        documentNumber: 'E12345678',
      },
    }),
  ])

  const [alice, bob, chen] = guests

  // 7) Bookings with documents & deposit transactions
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
      basePriceCurrency: 'EUR',
      cleaningFeeAmount: 4000,
      cleaningFeeCurrency: 'EUR',
      serviceFeeAmount: 2000,
      serviceFeeCurrency: 'EUR',
      taxesAmount: 3000,
      taxesCurrency: 'EUR',
      totalAmount: 45000,
      totalCurrency: 'EUR',
      notes: 'Late arrival ~22:00',
      documents: {
        create: [
          {
            type: 'RENTAL_AGREEMENT',
            template: 'default_agreement_v1',
            content: 'Terms and conditions... (mock)',
          },
        ],
      },
      depositTransactions: {
        create: [
          {
            action: DepositAction.HOLD,
            amount: 20000,
            currency: 'EUR',
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
      basePriceCurrency: 'EUR',
      totalAmount: 24000,
      totalCurrency: 'EUR',
      notes: 'Ask for early check-in if possible',
      depositTransactions: {
        create: [
          {
            action: DepositAction.HOLD,
            amount: 15000,
            currency: 'EUR',
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
      basePriceCurrency: 'EUR',
      totalAmount: 22000,
      totalCurrency: 'EUR',
      cancellationReason: 'Guest illness',
    },
  })

  // 8) Service Tasks + Service Orders
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
        checklist: ['Change linens', 'Vacuum', 'Restock amenities'],
        note: 'VIP guest – extra towels',
        serviceOrders: {
          create: [
            {
              orgId: org.id,
              status: ServiceOrderStatus.ACCEPTED,
              providerId: cleanCo.id,
              costAmount: 6000,
              costCurrency: 'EUR',
              notes: 'Standard turnover cleaning',
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
        checklist: ['Fix dripping faucet', 'Test water pressure'],
        serviceOrders: {
          create: [
            {
              orgId: org.id,
              status: ServiceOrderStatus.CREATED,
              providerId: repairPro.id,
              notes: 'Estimate pending',
            },
          ],
        },
      },
      include: { serviceOrders: true },
    }),
  ])

  const orderClean = taskClean.serviceOrders[0]
  const orderFix = taskFix.serviceOrders[0]

  // 9) Invoices + Items + Payments (link cleaning order)
  const invoice1 = await prisma.invoice.create({
    data: {
      orgId: org.id,
      orderId: orderClean.id,
      totalAmount: 6000,
      totalCurrency: 'EUR',
      status: InvoiceStatus.OPEN,
      issuedAt: daysFromNow(9),
      dueAt: daysFromNow(16),
      items: {
        create: [
          {
            name: 'Turnover Cleaning',
            qty: 1,
            priceAmount: 6000,
            priceCurrency: 'EUR',
            sumAmount: 6000,
            sumCurrency: 'EUR',
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.TRANSFER,
            amountAmount: 6000,
            amountCurrency: 'EUR',
            status: PaymentStatus.PENDING,
            provider: 'Stripe',
          },
        ],
      },
    },
    include: { items: true, payments: true },
  })

  // 10) Legal docs (examples)
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
      holdCurrency: 'EUR',
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
