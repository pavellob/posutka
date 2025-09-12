import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('ai-subgraph', {
        endpoint: 'http://localhost:4008/graphql'
      })
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    # Общие скаляры
    scalar UUID
    scalar DateTime
    scalar JSON

    # Денежные типы
    type Money {
      amount: Int!
      currency: String!
    }

    input MoneyInput {
      amount: Int!
      currency: String!
    }

    # Пагинация
    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
      startCursor: String
      endCursor: String
      totalCount: Int
    }

    # Общие енумы
    enum DepositAction {
      HOLD
      RELEASE
      CHARGE
      CAPTURE
      REFUND
    }

    enum TransactionStatus {
      PENDING
      COMPLETED
      FAILED
    }

    enum Channel {
      DIRECT
      AIRBNB
      BOOKING_COM
      AVITO
      OTHER
    }

    # Schema Extensions для связывания типов между субграфами

    # Расширения для Organization (из Identity субграфа)
    extend type Organization {
      # Связь с Bookings субграфом
      bookings: [Booking!]!
        @resolveTo(
          sourceName: "bookings-subgraph"
          sourceTypeName: "Query"
          sourceFieldName: "bookings"
          requiredSelectionSet: "{ id }"
          sourceArgs: { orgId: "{root.id}" }
        )
      
      # Связь с Billing субграфом
      invoices: [Invoice!]!
        @resolveTo(
          sourceName: "billing-subgraph"
          sourceTypeName: "Query"
          sourceFieldName: "invoices"
          requiredSelectionSet: "{ id }"
          sourceArgs: { orgId: "{root.id}" }
        )
    }

    # Расширения для User (из Identity субграфа)
    extend type User {
      # Связь с Identity субграфом для получения организаций пользователя
      organizations: [Organization!]!
        @resolveTo(
          sourceName: "identity-subgraph"
          sourceTypeName: "Query"
          sourceFieldName: "organizations"
          requiredSelectionSet: "{ id }"
          sourceArgs: { userId: "{root.id}" }
        )
    }

    # Расширения для Booking (из Bookings субграфа)
    extend type Booking {
      # Связь с Billing субграфом для счетов
      invoices: [Invoice!]!
        @resolveTo(
          sourceName: "billing-subgraph"
          sourceTypeName: "Query"
          sourceFieldName: "invoices"
          requiredSelectionSet: "{ id }"
          sourceArgs: { bookingId: "{root.id}" }
        )
    }

    # Дополнительные запросы для удобства
    extend type Query {
      # Получить все данные организации одним запросом
      organizationWithDetails(id: UUID!): Organization
      
      # Получить все данные пользователя одним запросом
      userWithDetails(id: UUID!): User
      
      # Получить все данные бронирования одним запросом
      bookingWithDetails(id: UUID!): Booking
    }
  `
})
