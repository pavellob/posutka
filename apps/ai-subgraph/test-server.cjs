const { readFileSync } = require('fs');
const path = require('path');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { createYoga } = require('graphql-yoga');
const { createServer } = require('http');
const gql = require('graphql-tag');

// Mock резолверы для тестирования
const resolvers = {
  Mutation: {
    aiCommand: async (_, { orgId, command, context }) => {
      // Простая логика интерпретации команд для тестирования
      const lowerCommand = command.toLowerCase();
      
      if (lowerCommand.includes('создать бронирование') || lowerCommand.includes('create booking')) {
        return {
          ok: true,
          message: 'Бронирование будет создано',
          affectedIds: ['booking-preview-1'],
          preview: {
            action: 'create_booking',
            orgId,
            command,
            context,
            estimatedBooking: {
              id: 'booking-preview-1',
              unitId: 'unit-1',
              guestName: 'Иван Иванов',
              checkIn: '2024-01-15',
              checkOut: '2024-01-20',
              totalPrice: 25000
            }
          }
        };
      }
      
      if (lowerCommand.includes('показать бронирования') || lowerCommand.includes('show bookings')) {
        return {
          ok: true,
          message: 'Список бронирований получен',
          affectedIds: [],
          preview: {
            action: 'show_bookings',
            orgId,
            command,
            context,
            bookings: [
              {
                id: 'booking-1',
                unitId: 'unit-1',
                guestName: 'Петр Петров',
                checkIn: '2024-01-10',
                checkOut: '2024-01-15',
                status: 'CONFIRMED'
              },
              {
                id: 'booking-2',
                unitId: 'unit-2',
                guestName: 'Анна Сидорова',
                checkIn: '2024-01-20',
                checkOut: '2024-01-25',
                status: 'PENDING'
              }
            ]
          }
        };
      }
      
      if (lowerCommand.includes('создать инвойс') || lowerCommand.includes('create invoice')) {
        return {
          ok: true,
          message: 'Инвойс будет создан',
          affectedIds: ['invoice-preview-1'],
          preview: {
            action: 'create_invoice',
            orgId,
            command,
            context,
            estimatedInvoice: {
              id: 'invoice-preview-1',
              orgId,
              items: [
                { name: 'Проживание', qty: 5, price: { amount: 5000, currency: 'RUB' } }
              ],
              total: { amount: 25000, currency: 'RUB' }
            }
          }
        };
      }
      
      if (lowerCommand.includes('показать статистику') || lowerCommand.includes('show stats')) {
        return {
          ok: true,
          message: 'Статистика получена',
          affectedIds: [],
          preview: {
            action: 'show_stats',
            orgId,
            command,
            context,
            stats: {
              totalBookings: 15,
              totalRevenue: 375000,
              averageBookingValue: 25000,
              occupancyRate: 0.75,
              topUnits: [
                { unitId: 'unit-1', bookings: 8, revenue: 200000 },
                { unitId: 'unit-2', bookings: 7, revenue: 175000 }
              ]
            }
          }
        };
      }
      
      // Команда не распознана
      return {
        ok: false,
        message: `Команда не распознана: "${command}". Доступные команды: создать бронирование, показать бронирования, создать инвойс, показать статистику`,
        affectedIds: [],
        preview: {
          recognized: false,
          suggestions: [
            'создать бронирование',
            'показать бронирования', 
            'создать инвойс',
            'показать статистику'
          ]
        }
      };
    },
  },
};

const typeDefs = gql(readFileSync(path.join(__dirname, 'src/schema/index.gql'), 'utf8'));
const schema = buildSubgraphSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  context: () => ({}),
});

const server = createServer(yoga);
server.listen(4008, () => console.log('ai-subgraph test server on :4008'));
