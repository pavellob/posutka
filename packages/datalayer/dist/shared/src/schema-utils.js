import gql from 'graphql-tag';
const sharedSchemaString = `
# Общие типы для всех подграфов

scalar UUID
scalar DateTime
scalar JSON

# Денежные типы
type Money @shareable {
  amount: Int!
  currency: String!
}

input MoneyInput {
  amount: Int!
  currency: String!
}

# Пагинация
type PageInfo @shareable {
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
`;
export function loadSharedSchema() {
    return gql(sharedSchemaString);
}
export function combineSchemas(subgraphSchema, sharedSchema) {
    return gql `
    ${sharedSchema}
    ${subgraphSchema}
  `;
}
