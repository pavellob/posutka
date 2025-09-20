"use strict";
// prisma-seed-mock.ts
// ESM/TypeScript seed script to populate your Prisma schema with a rich mock dataset.
// Run with: `pnpm tsx prisma-seed-mock.ts` (after `pnpm prisma db push`)
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function daysFromNow(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}
function upsertUser(email, name) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, prisma.user.upsert({
                    where: { email: email },
                    update: { name: name },
                    create: { email: email, name: name },
                })];
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, owner, manager, staff, org, allUnits, unitA, unitB, unitC, _b, cleanCo, repairPro, listings, guests, alice, bob, chen, booking1, booking2, booking3, _c, taskClean, taskFix, orderClean, orderFix, invoice1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('Seeding mock data...');
                    return [4 /*yield*/, Promise.all([
                            upsertUser('owner@example.com', 'Olga Owner'),
                            upsertUser('manager@example.com', 'Max Manager'),
                            upsertUser('staff@example.com', 'Sasha Staff'),
                        ])
                        // 2) Organization with Properties/Units
                    ];
                case 1:
                    _a = _d.sent(), owner = _a[0], manager = _a[1], staff = _a[2];
                    return [4 /*yield*/, prisma.organization.create({
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
                                        { user: { connect: { id: owner.id } }, role: client_1.Role.OWNER },
                                        { user: { connect: { id: manager.id } }, role: client_1.Role.MANAGER },
                                        { user: { connect: { id: staff.id } }, role: client_1.Role.STAFF },
                                    ],
                                },
                            },
                            include: {
                                properties: { include: { units: true } },
                            },
                        })
                        // Helpers
                    ];
                case 2:
                    org = _d.sent();
                    allUnits = org.properties.flatMap(function (p) { return p.units; });
                    unitA = allUnits[0];
                    unitB = allUnits[1];
                    unitC = allUnits[2];
                    // 3) Calendar blocks
                    return [4 /*yield*/, prisma.calendarBlock.createMany({
                            data: [
                                { unitId: unitA.id, from: daysFromNow(1), to: daysFromNow(3), note: 'Owner stay' },
                                { unitId: unitB.id, from: daysFromNow(14), to: daysFromNow(16), note: 'Maintenance' },
                            ],
                        })
                        // 4) Service Providers
                    ];
                case 3:
                    // 3) Calendar blocks
                    _d.sent();
                    return [4 /*yield*/, Promise.all([
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
                    ];
                case 4:
                    _b = _d.sent(), cleanCo = _b[0], repairPro = _b[1];
                    return [4 /*yield*/, Promise.all([unitA, unitB, unitC].map(function (u, idx) {
                            return prisma.listing.create({
                                data: {
                                    unitId: u.id,
                                    status: idx === 2 ? client_1.ListingStatus.DRAFT : client_1.ListingStatus.PUBLISHED,
                                    channel: idx === 1 ? client_1.Channel.AIRBNB : client_1.Channel.DIRECT,
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
                            });
                        }))
                        // 6) Guests
                    ];
                case 5:
                    listings = _d.sent();
                    return [4 /*yield*/, prisma.$transaction([
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
                        ])];
                case 6:
                    guests = _d.sent();
                    alice = guests[0], bob = guests[1], chen = guests[2];
                    return [4 /*yield*/, prisma.booking.create({
                            data: {
                                orgId: org.id,
                                unitId: unitA.id,
                                guestId: alice.id,
                                status: client_1.BookingStatus.CONFIRMED,
                                source: client_1.BookingSource.DIRECT,
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
                                            action: client_1.DepositAction.HOLD,
                                            amount: 20000,
                                            currency: 'EUR',
                                            status: client_1.TransactionStatus.COMPLETED,
                                            transactionId: 'psp_tx_001',
                                        },
                                    ],
                                },
                            },
                            include: { documents: true, depositTransactions: true },
                        })];
                case 7:
                    booking1 = _d.sent();
                    return [4 /*yield*/, prisma.booking.create({
                            data: {
                                orgId: org.id,
                                unitId: unitB.id,
                                guestId: bob.id,
                                status: client_1.BookingStatus.PENDING,
                                source: client_1.BookingSource.AIRBNB,
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
                                            action: client_1.DepositAction.HOLD,
                                            amount: 15000,
                                            currency: 'EUR',
                                            status: client_1.TransactionStatus.PENDING,
                                        },
                                    ],
                                },
                            },
                            include: { depositTransactions: true },
                        })];
                case 8:
                    booking2 = _d.sent();
                    return [4 /*yield*/, prisma.booking.create({
                            data: {
                                orgId: org.id,
                                unitId: unitC.id,
                                guestId: chen.id,
                                status: client_1.BookingStatus.CANCELLED,
                                source: client_1.BookingSource.DIRECT,
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
                    ];
                case 9:
                    booking3 = _d.sent();
                    return [4 /*yield*/, prisma.$transaction([
                            prisma.task.create({
                                data: {
                                    orgId: org.id,
                                    unitId: unitA.id,
                                    bookingId: booking1.id,
                                    type: client_1.TaskType.CLEANING,
                                    status: client_1.TaskStatus.TODO,
                                    dueAt: daysFromNow(9),
                                    assignedProviderId: cleanCo.id,
                                    checklist: ['Change linens', 'Vacuum', 'Restock amenities'],
                                    note: 'VIP guest – extra towels',
                                    serviceOrders: {
                                        create: [
                                            {
                                                orgId: org.id,
                                                status: client_1.ServiceOrderStatus.ACCEPTED,
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
                                    type: client_1.TaskType.MAINTENANCE,
                                    status: client_1.TaskStatus.IN_PROGRESS,
                                    dueAt: daysFromNow(15),
                                    assignedProviderId: repairPro.id,
                                    checklist: ['Fix dripping faucet', 'Test water pressure'],
                                    serviceOrders: {
                                        create: [
                                            {
                                                orgId: org.id,
                                                status: client_1.ServiceOrderStatus.CREATED,
                                                providerId: repairPro.id,
                                                notes: 'Estimate pending',
                                            },
                                        ],
                                    },
                                },
                                include: { serviceOrders: true },
                            }),
                        ])];
                case 10:
                    _c = _d.sent(), taskClean = _c[0], taskFix = _c[1];
                    orderClean = taskClean.serviceOrders[0];
                    orderFix = taskFix.serviceOrders[0];
                    return [4 /*yield*/, prisma.invoice.create({
                            data: {
                                orgId: org.id,
                                orderId: orderClean.id,
                                totalAmount: 6000,
                                totalCurrency: 'EUR',
                                status: client_1.InvoiceStatus.OPEN,
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
                                            method: client_1.PaymentMethod.TRANSFER,
                                            amountAmount: 6000,
                                            amountCurrency: 'EUR',
                                            status: client_1.PaymentStatus.PENDING,
                                            provider: 'Stripe',
                                        },
                                    ],
                                },
                            },
                            include: { items: true, payments: true },
                        })
                        // 10) Legal docs (examples)
                    ];
                case 11:
                    invoice1 = _d.sent();
                    // 10) Legal docs (examples)
                    return [4 /*yield*/, prisma.legalDocument.createMany({
                            data: [
                                { type: 'HOUSE_RULES', url: 'https://example.com/house-rules.pdf', bookingId: booking1.id },
                                { type: 'GDPR_CONSENT', url: 'https://example.com/gdpr-consent.pdf', bookingId: booking1.id },
                            ],
                        })];
                case 12:
                    // 10) Legal docs (examples)
                    _d.sent();
                    return [4 /*yield*/, prisma.legalDepositTransaction.create({
                            data: {
                                bookingId: booking1.id,
                                holdAmount: 20000,
                                holdCurrency: 'EUR',
                                capturedAmount: null,
                                method: 'CARD',
                                status: 'HELD',
                            },
                        })];
                case 13:
                    _d.sent();
                    console.log('Seed complete ✅');
                    return [2 /*return*/, {
                            org: org,
                            users: { owner: owner, manager: manager, staff: staff },
                            units: allUnits.length,
                            listings: listings.length,
                            guests: guests.length,
                            bookings: [booking1, booking2, booking3].length,
                            tasks: 2,
                            orders: 2,
                            invoiceId: invoice1.id,
                        }];
            }
        });
    });
}
main()
    .then(function (summary) { return console.log('Summary:', summary); })
    .catch(function (e) {
    console.error(e);
    process.exitCode = 1;
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
