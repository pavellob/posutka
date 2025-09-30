import { gql } from 'graphql-request'

// ===== ЗАПРОСЫ ДЛЯ ИНВЕНТАРЯ (ОБЪЕКТЫ И ЕДИНИЦЫ) =====

export const GET_PROPERTIES_BY_ORG = gql`
  query GetPropertiesByOrg($orgId: UUID!) {
    propertiesByOrgId(orgId: $orgId) {
      id
      title
      address
      amenities
      org {
        id
        name
      }
    }
  }
`

export const GET_PROPERTY_BY_ID = gql`
  query GetPropertyById($id: UUID!) {
    property(id: $id) {
      id
      title
      address
      amenities
      org {
        id
        name
        currency
      }
    }
  }
`

export const GET_UNITS_BY_PROPERTY = gql`
  query GetUnitsByProperty($propertyId: UUID!) {
    unitsByPropertyId(propertyId: $propertyId) {
      id
      name
      capacity
      beds
      bathrooms
      amenities
      property {
        id
        title
        address
      }
    }
  }
`

export const GET_UNIT_BY_ID = gql`
  query GetUnitById($id: UUID!) {
    unit(id: $id) {
      id
      name
      capacity
      beds
      bathrooms
      amenities
      property {
        id
        title
        address
        org {
          id
          name
        }
      }
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ БРОНИРОВАНИЙ =====

export const GET_BOOKINGS = gql`
  query GetBookings(
    $orgId: UUID
    $unitId: UUID
    $from: DateTime
    $to: DateTime
    $status: BookingStatus
    $first: Int
    $after: String
  ) {
    bookings(
      orgId: $orgId
      unitId: $unitId
      from: $from
      to: $to
      status: $status
      first: $first
      after: $after
    ) {
      edges {
        node {
          id
          status
          source
          checkIn
          checkOut
          guestsCount
          notes
          cancellationReason
          createdAt
          updatedAt
          unit {
            id
            name
            property {
              id
              title
            }
          }
          guest {
            id
            name
            email
            phone
          }
          priceBreakdown {
            basePrice {
              amount
              currency
            }
            cleaningFee {
              amount
              currency
            }
            serviceFee {
              amount
              currency
            }
            taxes {
              amount
              currency
            }
            total {
              amount
              currency
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
    }
  }
`

export const GET_BOOKING_BY_ID = gql`
  query GetBookingById($id: UUID!) {
    booking(id: $id) {
      id
      status
      source
      checkIn
      checkOut
      guestsCount
      notes
      cancellationReason
      createdAt
      updatedAt
      org {
        id
        name
      }
      unit {
        id
        name
        capacity
        beds
        bathrooms
        amenities
        property {
          id
          title
          address
        }
      }
      guest {
        id
        name
        email
        phone
        documentType
        documentNumber
      }
      priceBreakdown {
        basePrice {
          amount
          currency
        }
        cleaningFee {
          amount
          currency
        }
        serviceFee {
          amount
          currency
        }
        taxes {
          amount
          currency
        }
        total {
          amount
          currency
        }
      }
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ БИЛЛИНГА =====

export const GET_INVOICES = gql`
  query GetInvoices($orgId: UUID!, $first: Int, $after: String, $status: InvoiceStatus) {
    invoices(orgId: $orgId, first: $first, after: $after, status: $status) {
      edges {
        node {
          id
          status
          issuedAt
          dueAt
          total {
            amount
            currency
          }
          items {
            name
            qty
            price {
              amount
              currency
            }
            sum {
              amount
              currency
            }
          }
          org {
            id
            name
          }
          order {
            id
            status
            cost {
              amount
              currency
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
    }
  }
`

export const GET_INVOICE_BY_ID = gql`
  query GetInvoiceById($id: UUID!) {
    invoice(id: $id) {
      id
      status
      issuedAt
      dueAt
      total {
        amount
        currency
      }
      items {
        name
        qty
        price {
          amount
          currency
        }
        sum {
          amount
          currency
        }
      }
      org {
        id
        name
        currency
      }
      order {
        id
        status
        cost {
          amount
          currency
        }
        task {
          id
          type
          status
        }
      }
    }
  }
`

export const GET_PAYMENT_BY_ID = gql`
  query GetPaymentById($id: UUID!) {
    payment(id: $id) {
      id
      method
      amount {
        amount
        currency
      }
      status
      createdAt
      provider
      providerRef
      receiptUrl
      invoice {
        id
        status
        total {
          amount
          currency
        }
      }
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ ИДЕНТИЧНОСТИ И ДОСТУПА =====

export const GET_USERS = gql`
  query GetUsers($first: Int, $after: String) {
    users(first: $first, after: $after) {
      edges {
        node {
          id
          email
          name
          createdAt
          updatedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
    }
  }
`

export const GET_USER_BY_ID = gql`
  query GetUserById($id: UUID!) {
    user(id: $id) {
      id
      email
      name
      createdAt
      updatedAt
    }
  }
`

export const GET_ORGANIZATIONS = gql`
  query GetOrganizations($first: Int, $after: String) {
    organizations(first: $first, after: $after) {
      edges {
        node {
          id
          name
          timezone
          currency
          createdAt
          updatedAt
          members {
            id
            role
            createdAt
            user {
              id
              email
              name
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
    }
  }
`

export const GET_ORGANIZATION_BY_ID = gql`
  query GetOrganizationById($id: UUID!) {
    organization(id: $id) {
      id
      name
      timezone
      currency
      createdAt
      updatedAt
      members {
        id
        role
        createdAt
        user {
          id
          email
          name
        }
      }
    }
  }
`

export const GET_MEMBERSHIPS_BY_ORG = gql`
  query GetMembershipsByOrg($orgId: UUID!) {
    membershipsByOrg(orgId: $orgId) {
      id
      role
      createdAt
      updatedAt
      user {
        id
        email
        name
        createdAt
      }
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ ОПЕРАЦИЙ =====

export const GET_TASKS = gql`
  query GetTasks(
    $orgId: UUID!
    $status: TaskStatus
    $type: TaskType
    $first: Int
    $after: String
  ) {
    tasks(orgId: $orgId, status: $status, type: $type, first: $first, after: $after) {
      edges {
        node {
          id
          type
          status
          dueAt
          note
          createdAt
          updatedAt
          org {
            id
            name
          }
          unit {
            id
            name
            property {
              id
              title
            }
          }
          booking {
            id
            checkIn
            checkOut
            guest {
              name
              email
            }
          }
          assignedTo {
            id
            name
            rating
            contact
          }
          checklist
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
    }
  }
`

export const GET_TASK_BY_ID = gql`
  query GetTaskById($id: UUID!) {
    task(id: $id) {
      id
      type
      status
      dueAt
      note
      createdAt
      updatedAt
      org {
        id
        name
      }
      unit {
        id
        name
        property {
          id
          title
          address
        }
      }
      booking {
        id
        checkIn
        checkOut
        guest {
          name
          email
          phone
        }
      }
      assignedTo {
        id
        name
        rating
        contact
        serviceTypes
      }
      checklist
    }
  }
`

export const GET_SERVICE_PROVIDERS = gql`
  query GetServiceProviders($serviceTypes: [TaskType!]) {
    serviceProviders(serviceTypes: $serviceTypes) {
      id
      name
      serviceTypes
      rating
      contact
      createdAt
      updatedAt
    }
  }
`

export const GET_SERVICE_PROVIDER_BY_ID = gql`
  query GetServiceProviderById($id: UUID!) {
    serviceProvider(id: $id) {
      id
      name
      serviceTypes
      rating
      contact
      createdAt
      updatedAt
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ ОБЪЯВЛЕНИЙ =====

export const GET_LISTINGS = gql`
  query GetListings($unitId: UUID!, $first: Int, $after: String) {
    listings(unitId: $unitId, first: $first, after: $after) {
      edges {
        node {
          id
          status
          channel
          basePrice {
            amount
            currency
          }
          minNights
          maxNights
          externalId
          lastSyncAt
          unit {
            id
            name
            property {
              id
              title
            }
          }
          discounts {
            id
            name
            percentOff
            minNights
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
    }
  }
`

export const GET_LISTING_BY_ID = gql`
  query GetListingById($id: UUID!) {
    listing(id: $id) {
      id
      status
      channel
      basePrice {
        amount
        currency
      }
      minNights
      maxNights
      externalId
      lastSyncAt
      unit {
        id
        name
        capacity
        beds
        bathrooms
        amenities
        property {
          id
          title
          address
        }
      }
      discounts {
        id
        name
        percentOff
        minNights
      }
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ ЮРИДИЧЕСКИХ ДОКУМЕНТОВ =====

export const GET_DOCUMENTS_BY_BOOKING = gql`
  query GetDocumentsByBooking($bookingId: UUID!) {
    documentsByBookingId(bookingId: $bookingId) {
      id
      type
      template
      content
      url
      signedAt
      createdAt
      updatedAt
      meta
      booking {
        id
        checkIn
        checkOut
        guest {
          name
          email
        }
      }
    }
  }
`

export const GET_DOCUMENT_BY_ID = gql`
  query GetDocumentById($id: UUID!) {
    document(id: $id) {
      id
      type
      template
      content
      url
      signedAt
      createdAt
      updatedAt
      meta
      booking {
        id
        checkIn
        checkOut
        guest {
          name
          email
        }
      }
    }
  }
`

export const GET_DEPOSIT_TRANSACTIONS_BY_BOOKING = gql`
  query GetDepositTransactionsByBooking($bookingId: UUID!) {
    depositTransactionsByBookingId(bookingId: $bookingId) {
      id
      action
      amount {
        amount
        currency
      }
      status
      transactionId
      notes
      createdAt
      updatedAt
      booking {
        id
        checkIn
        checkOut
        guest {
          name
          email
        }
      }
    }
  }
`

export const GET_DEPOSIT_TX_BY_ID = gql`
  query GetDepositTxById($id: UUID!) {
    depositTx(id: $id) {
      id
      action
      amount {
        amount
        currency
      }
      status
      transactionId
      notes
      createdAt
      updatedAt
      booking {
        id
        checkIn
        checkOut
        guest {
          name
          email
        }
      }
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ AI =====

export const AI_COMMAND = gql`
  mutation AICommand($orgId: UUID!, $command: String!, $context: JSON) {
    aiCommand(orgId: $orgId, command: $command, context: $context) {
      ok
      message
      affectedIds
      preview
    }
  }
`

// ===== МУТАЦИИ ДЛЯ БРОНИРОВАНИЙ =====

export const CREATE_BOOKING = gql`
  mutation CreateBooking($input: CreateBookingInput!) {
    createBooking(input: $input) {
      id
      status
      source
      checkIn
      checkOut
      guestsCount
      notes
      createdAt
      unit {
        id
        name
        property {
          id
          title
        }
      }
      guest {
        id
        name
        email
        phone
      }
      priceBreakdown {
        basePrice {
          amount
          currency
        }
        total {
          amount
          currency
        }
      }
    }
  }
`

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($id: UUID!, $reason: String) {
    cancelBooking(id: $id, reason: $reason) {
      id
      status
      cancellationReason
      updatedAt
    }
  }
`

export const CHANGE_BOOKING_DATES = gql`
  mutation ChangeBookingDates($id: UUID!, $checkIn: DateTime!, $checkOut: DateTime!) {
    changeBookingDates(id: $id, checkIn: $checkIn, checkOut: $checkOut) {
      id
      checkIn
      checkOut
      updatedAt
    }
  }
`

export const GENERATE_GRAPHQL_QUERY = gql`
  mutation GenerateGraphQLQuery(
    $orgId: UUID!
    $description: String!
    $adapterConfig: AIAdapterConfig!
    $schemaContext: JSON
  ) {
    generateGraphQLQuery(
      orgId: $orgId
      description: $description
      adapterConfig: $adapterConfig
      schemaContext: $schemaContext
    ) {
      query
      variables
      description
      success
      error
    }
  }
`
