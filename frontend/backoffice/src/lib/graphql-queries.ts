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
      # Яндекс.Недвижимость поля
      propertyType
      category
      dealStatus
      country
      region
      district
      localityName
      apartment
      metroName
      metroTimeOnFoot
      metroTimeOnTransport
      latitude
      longitude
      totalArea
      livingArea
      kitchenArea
      rooms
      roomsOffered
      floor
      floorsTotal
      buildingType
      buildingYear
      buildingSeries
      elevator
      parking
      security
      concierge
      playground
      gym
      balcony
      loggia
      airConditioning
      internet
      washingMachine
      dishwasher
      tv
      renovation
      furniture
      isElite
      yandexBuildingId
      yandexHouseId
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
          memberships {
            id
            role
            organization {
              id
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
          assignedCleaner {
            id
            firstName
            lastName
            phone
            email
            rating
            isActive
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
      assignedCleaner {
        id
        firstName
        lastName
        phone
        email
        rating
        isActive
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

// ===== ЗАПРОСЫ ДЛЯ ДАШБОРДА =====

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats($orgId: UUID!) {
    # Активные брони на сегодня
    activeBookings: bookings(
      orgId: $orgId
      status: CONFIRMED
      first: 100
    ) {
      pageInfo {
        totalCount
      }
      edges {
        node {
          id
          checkIn
          checkOut
          status
        }
      }
    }
    
    # Уборки организации
    todayCleanings: cleanings(
      orgId: $orgId
      first: 50
    ) {
      pageInfo {
        totalCount
      }
      edges {
        node {
          id
          status
          scheduledAt
          cleaner {
            id
            firstName
            lastName
          }
          unit {
            id
            name
            property {
              title
            }
          }
        }
      }
    }
    
    # Задачи организации
    workingStaff: tasks(
      orgId: $orgId
      first: 50
    ) {
      pageInfo {
        totalCount
      }
      edges {
        node {
          id
          type
          status
          dueAt
          assignedTo {
            id
            name
          }
          createdAt
        }
      }
    }
  }
`

export const GET_RECENT_TASKS = gql`
  query GetRecentTasks($orgId: UUID!, $first: Int = 10) {
    tasks(orgId: $orgId, first: $first) {
      edges {
        node {
          id
          type
          status
          dueAt
          createdAt
          updatedAt
          assignedTo {
            id
            name
          }
        }
      }
    }
  }
`

export const GET_RECENT_NOTIFICATIONS = gql`
  query GetRecentNotifications($orgId: UUID!, $first: Int = 10) {
    # Пока используем заглушку, так как notifications может не существовать
    tasks(orgId: $orgId, first: $first) {
      edges {
        node {
          id
          type
          status
          dueAt
          createdAt
        }
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

// ===== МУТАЦИИ ДЛЯ ЗАДАЧ =====

export const ASSIGN_TASK = gql`
  mutation AssignTask($input: AssignTaskInput!) {
    assignTask(input: $input) {
      id
      status
      dueAt
      note
      updatedAt
      assignedTo {
        id
        name
        contact
      }
      assignedCleaner {
        id
        firstName
        lastName
        phone
        email
        rating
        isActive
      }
    }
  }
`

export const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($id: UUID!, $status: TaskStatus!) {
    updateTaskStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`

export const UPDATE_TASK = gql`
  mutation UpdateTask($input: UpdateTaskInput!) {
    updateTask(input: $input) {
      id
      type
      status
      dueAt
      note
      updatedAt
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ УБОРОК (CLEANING) =====

export const GET_CLEANERS = gql`
  query GetCleaners($orgId: UUID!, $isActive: Boolean, $first: Int, $after: String) {
    cleaners(orgId: $orgId, isActive: $isActive, first: $first, after: $after) {
      edges {
        node {
          id
          user {
            id
          }
          org {
            id
          }
          firstName
          lastName
          phone
          email
          rating
          isActive
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

export const GET_CLEANER = gql`
  query GetCleaner($id: UUID!) {
    cleaner(id: $id) {
      id
      user {
        id
      }
      org {
        id
      }
      firstName
      lastName
      phone
      email
      rating
      isActive
      createdAt
      updatedAt
      cleanings {
        id
        status
        scheduledAt
        unit {
          id
          name
        }
      }
    }
  }
`

export const GET_CLEANING_TEMPLATES = gql`
  query GetCleaningTemplates($unitId: UUID!) {
    cleaningTemplates(unitId: $unitId) {
      id
      unit {
        id
      }
      name
      description
      requiresLinenChange
      estimatedDuration
      checklistItems {
        id
        label
        order
        isRequired
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CLEANING_TEMPLATE = gql`
  query GetCleaningTemplate($id: UUID!) {
    cleaningTemplate(id: $id) {
      id
      unit {
        id
      }
      name
      description
      requiresLinenChange
      estimatedDuration
      checklistItems {
        id
        label
        order
        isRequired
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CLEANINGS = gql`
  query GetCleanings(
    $orgId: UUID
    $unitId: UUID
    $cleanerId: UUID
    $bookingId: UUID
    $status: CleaningStatus
    $from: DateTime
    $to: DateTime
    $first: Int
    $after: String
  ) {
    cleanings(
      orgId: $orgId
      unitId: $unitId
      cleanerId: $cleanerId
      bookingId: $bookingId
      status: $status
      from: $from
      to: $to
      first: $first
      after: $after
    ) {
      edges {
        node {
          id
          org {
            id
          }
          cleaner {
            id
            firstName
            lastName
            phone
            email
            rating
          }
          unit {
            id
            name
          }
          booking {
            id
          }
          taskId
          status
          scheduledAt
          startedAt
          completedAt
          notes
          requiresLinenChange
          checklistItems {
            id
            label
            isChecked
            order
            createdAt
            updatedAt
          }
          documents {
            id
            type
            notes
            photos {
              id
              url
              caption
              order
              createdAt
              updatedAt
            }
            createdAt
            updatedAt
          }
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

export const GET_CLEANING = gql`
  query GetCleaning($id: UUID!) {
    cleaning(id: $id) {
      id
      org {
        id
      }
      cleaner {
        id
        user {
          id
        }
        firstName
        lastName
        phone
        email
        rating
      }
      unit {
        id
        name
      }
      booking {
        id
      }
      taskId
      status
      scheduledAt
      startedAt
      completedAt
      notes
      requiresLinenChange
      checklistItems {
        id
        label
        isChecked
        order
        createdAt
        updatedAt
      }
      reviews {
        id
        managerId
        status
        comment
        createdAt
      }
      documents {
        id
        type
        notes
        photos {
          id
          url
          caption
          order
          createdAt
          updatedAt
        }
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`

// ===== МУТАЦИИ ДЛЯ УБОРОК =====

export const CREATE_CLEANER = gql`
  mutation CreateCleaner($input: CreateCleanerInput!) {
    createCleaner(input: $input) {
      id
      user {
        id
      }
      org {
        id
      }
      firstName
      lastName
      phone
      email
      rating
      isActive
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLEANER = gql`
  mutation UpdateCleaner($id: UUID!, $input: UpdateCleanerInput!) {
    updateCleaner(id: $id, input: $input) {
      id
      firstName
      lastName
      phone
      email
      rating
      isActive
      updatedAt
    }
  }
`

export const DEACTIVATE_CLEANER = gql`
  mutation DeactivateCleaner($id: UUID!) {
    deactivateCleaner(id: $id) {
      id
      isActive
      deletedAt
      updatedAt
    }
  }
`

export const ASSIGN_CLEANING_TO_ME = gql`
  mutation AssignCleaningToMe($id: UUID!) {
    assignCleaningToMe(cleaningId: $id) {
      id
      status
      startedAt
      cleaner {
        id
        firstName
        lastName
        user {
          id
        }
      }
    }
  }
`

export const APPROVE_CLEANING = gql`
  mutation ApproveCleaning($id: UUID!, $managerId: UUID!, $comment: String) {
    approveCleaning(id: $id, managerId: $managerId, comment: $comment) {
      id
      status
      completedAt
      reviews {
        id
        managerId
        status
        comment
        createdAt
      }
    }
  }
`

export const ACTIVATE_CLEANER = gql`
  mutation ActivateCleaner($id: UUID!) {
    activateCleaner(id: $id) {
      id
      isActive
      deletedAt
      updatedAt
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ УВЕДОМЛЕНИЙ =====

export const GET_NOTIFICATIONS = gql`
  query GetNotifications(
    $userId: UUID
    $orgId: UUID
    $status: NotificationStatus
    $unreadOnly: Boolean
    $first: Int
  ) {
    notifications(
      userId: $userId
      orgId: $orgId
      status: $status
      unreadOnly: $unreadOnly
      first: $first
    ) {
      edges {
        node {
          id
          eventType
          priority
          status
          title
          message
          actionUrl
          actionText
          createdAt
          readAt
        }
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`

export const MARK_AS_READ = gql`
  mutation MarkAsRead($id: UUID!) {
    markAsRead(id: $id) {
      id
      status
      readAt
    }
  }
`

export const MARK_ALL_AS_READ = gql`
  mutation MarkAllAsRead($userId: UUID!) {
    markAllAsRead(userId: $userId)
  }
`

export const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
      userId
      telegramChatId
      enabled
      enabledChannels
    }
  }
`

export const CREATE_CLEANING_TEMPLATE = gql`
  mutation CreateCleaningTemplate($input: CreateCleaningTemplateInput!) {
    createCleaningTemplate(input: $input) {
      id
      unit {
        id
      }
      name
      description
      requiresLinenChange
      estimatedDuration
      checklistItems {
        id
        label
        order
        isRequired
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLEANING_TEMPLATE = gql`
  mutation UpdateCleaningTemplate($id: UUID!, $input: UpdateCleaningTemplateInput!) {
    updateCleaningTemplate(id: $id, input: $input) {
      id
      name
      description
      requiresLinenChange
      estimatedDuration
      checklistItems {
        id
        label
        order
        isRequired
      }
      updatedAt
    }
  }
`

export const DELETE_CLEANING_TEMPLATE = gql`
  mutation DeleteCleaningTemplate($id: UUID!) {
    deleteCleaningTemplate(id: $id)
  }
`

export const SCHEDULE_CLEANING = gql`
  mutation ScheduleCleaning($input: ScheduleCleaningInput!) {
    scheduleCleaning(input: $input) {
      id
      org {
        id
      }
      cleaner {
        id
        firstName
        lastName
      }
      unit {
        id
        name
      }
      booking {
        id
      }
      taskId
      status
      scheduledAt
      notes
      requiresLinenChange
      checklistItems {
        id
        label
        isChecked
        order
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CLEANING_BY_TASK = gql`
  query GetCleaningByTask($taskId: UUID!) {
    cleaningByTask(taskId: $taskId) {
      id
      status
      scheduledAt
      startedAt
      completedAt
      cleaner {
        id
        firstName
        lastName
      }
      checklistItems {
        id
        label
        isChecked
        order
      }
      documents {
        id
        type
        notes
        photos {
          id
          url
          caption
        }
      }
    }
  }
`

export const START_CLEANING = gql`
  mutation StartCleaning($id: UUID!) {
    startCleaning(id: $id) {
      id
      status
      startedAt
      updatedAt
    }
  }
`

export const COMPLETE_CLEANING = gql`
  mutation CompleteCleaning($id: UUID!, $input: CompleteCleaningInput!) {
    completeCleaning(id: $id, input: $input) {
      id
      status
      completedAt
      notes
      checklistItems {
        id
        label
        isChecked
        order
      }
      updatedAt
    }
  }
`

export const CANCEL_CLEANING = gql`
  mutation CancelCleaning($id: UUID!, $reason: String) {
    cancelCleaning(id: $id, reason: $reason) {
      id
      status
      notes
      updatedAt
    }
  }
`

export const UPDATE_CLEANING_CHECKLIST = gql`
  mutation UpdateCleaningChecklist($id: UUID!, $items: [ChecklistItemInput!]!) {
    updateCleaningChecklist(id: $id, items: $items) {
      id
      checklistItems {
        id
        label
        isChecked
        order
      }
      updatedAt
    }
  }
`

export const CREATE_PRE_CLEANING_DOCUMENT = gql`
  mutation CreatePreCleaningDocument($cleaningId: UUID!, $input: CreateCleaningDocumentInput!) {
    createPreCleaningDocument(cleaningId: $cleaningId, input: $input) {
      id
      cleaning {
        id
      }
      type
      notes
      photos {
        id
        url
        caption
        order
      }
      createdAt
      updatedAt
    }
  }
`

export const CREATE_POST_CLEANING_DOCUMENT = gql`
  mutation CreatePostCleaningDocument($cleaningId: UUID!, $input: CreateCleaningDocumentInput!) {
    createPostCleaningDocument(cleaningId: $cleaningId, input: $input) {
      id
      cleaning {
        id
      }
      type
      notes
      photos {
        id
        url
        caption
        order
      }
      createdAt
      updatedAt
    }
  }
`

export const ADD_PHOTO_TO_DOCUMENT = gql`
  mutation AddPhotoToDocument($documentId: UUID!, $input: AddPhotoInput!) {
    addPhotoToDocument(documentId: $documentId, input: $input) {
      id
      url
      caption
      order
      createdAt
      updatedAt
    }
  }
`

export const DELETE_PHOTO_FROM_DOCUMENT = gql`
  mutation DeletePhotoFromDocument($photoId: UUID!) {
    deletePhotoFromDocument(photoId: $photoId)
  }
`

// ===== CHECKLIST QUERIES =====

export const GET_CHECKLISTS_BY_UNIT = gql`
  query GetChecklistsByUnit($unitId: UUID!) {
    checklistsByUnit(unitId: $unitId) {
      id
      unitId
      version
      items {
        id
        key
        order
        title
        description
        type
        required
        requiresPhoto
        photoMin
        exampleMedia {
          id
          url
          objectKey
          mimeType
          caption
          order
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const ACTIVATE_CHECKLIST = gql`
  mutation ActivateChecklist($id: UUID!) {
    activateChecklist(id: $id) {
      id
      name
      isActive
      items {
        id
        order
        title
        description
        requiresPhoto
        templateMedia {
          id
          objectKey
          url
          mimeType
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CHECKLIST = gql`
  mutation DeleteChecklist($id: UUID!) {
    deleteChecklist(id: $id)
  }
`

export const UPDATE_CHECKLIST_ITEM_ORDER = gql`
  mutation UpdateChecklistItemOrder($checklistId: UUID!, $itemIds: [UUID!]!) {
    updateChecklistItemOrder(checklistId: $checklistId, itemIds: $itemIds) {
      id
      name
      isActive
      items {
        id
        order
        title
        description
        requiresPhoto
        templateMedia {
          id
          objectKey
          url
          mimeType
        }
      }
      createdAt
      updatedAt
    }
  }
`

// ===== CHECKLIST MUTATIONS =====

export const CREATE_CHECKLIST = gql`
  mutation CreateChecklist($input: CreateChecklistInput!) {
    createChecklist(input: $input) {
      id
      name
      requirePhotoPerItem
      items {
        id
        order
        title
        description
        requiresPhoto
      }
      createdAt
      updatedAt
    }
  }
`


// ===== ЗАПРОСЫ ДЛЯ УПРАВЛЕНИЯ ПРИВЯЗКОЙ УБОРЩИКОВ К КВАРТИРАМ =====

export const GET_UNIT_PREFERRED_CLEANERS = gql`
  query GetUnitPreferredCleaners($unitId: UUID!) {
    unitPreferredCleaners(unitId: $unitId) {
      id
      cleaner {
        id
        firstName
        lastName
        telegramUsername
        rating
        isActive
      }
      createdAt
    }
  }
`

export const ADD_PREFERRED_CLEANER = gql`
  mutation AddPreferredCleaner($unitId: UUID!, $cleanerId: UUID!) {
    addPreferredCleaner(unitId: $unitId, cleanerId: $cleanerId) {
      id
    }
  }
`

export const REMOVE_PREFERRED_CLEANER = gql`
  mutation RemovePreferredCleaner($unitId: UUID!, $cleanerId: UUID!) {
    removePreferredCleaner(unitId: $unitId, cleanerId: $cleanerId) {
      id
    }
  }
`

// ===== ЗАПРОСЫ ДЛЯ ЧЕКЛИСТОВ =====

export const GET_CLEANING_TEMPLATES_BY_UNIT = gql`
  query GetCleaningTemplatesByUnit($unitId: UUID!) {
    cleaningTemplates(unitId: $unitId) {
      id
      name
      checklistItems {
        id
        label
        order
      }
    }
  }
`

export const UPDATE_CLEANING_TEMPLATE_CHECKLIST = gql`
  mutation UpdateCleaningTemplateChecklist($id: UUID!, $items: [ChecklistTemplateItemInput!]!) {
    updateCleaningTemplate(id: $id, input: { checklistItems: $items }) {
      id
      name
      checklistItems {
        id
        label
        order
      }
    }
  }
`

// ===== НОВАЯ МОДЕЛЬ ЧЕК-ЛИСТОВ (Template → Instance → Promote) =====

// Queries
export const GET_CHECKLIST_TEMPLATE = gql`
  query GetChecklistTemplate($unitId: UUID!, $version: Int) {
    checklistTemplate(unitId: $unitId, version: $version) {
      id
      unitId
      version
      createdAt
      updatedAt
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const GET_CHECKLIST_INSTANCE = gql`
  query GetChecklistInstance($id: UUID!) {
    checklistInstance(id: $id) {
      id
      unitId
      cleaningId
      stage
      status
      templateId
      templateVersion
      parentInstanceId
      createdAt
      updatedAt
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
        exampleMedia {
          id
          url
          objectKey
          caption
          order
        }
      }
      answers {
        id
        itemKey
        value
        note
        createdAt
        updatedAt
      }
      attachments {
        id
        itemKey
        url
        caption
      }
    }
  }
`

export const GET_CHECKLIST_BY_CLEANING_AND_STAGE = gql`
  query GetChecklistByCleaningAndStage($cleaningId: UUID!, $stage: ChecklistStage!) {
    checklistByCleaning(cleaningId: $cleaningId, stage: $stage) {
      id
      unitId
      cleaningId
      stage
      status
      templateId
      templateVersion
      parentInstanceId
      createdAt
      updatedAt
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
        exampleMedia {
          id
          url
          objectKey
          caption
          order
        }
      }
      answers {
        id
        itemKey
        value
        note
        createdAt
        updatedAt
      }
      attachments {
        id
        itemKey
        url
        caption
      }
    }
  }
`

// Mutations
export const CREATE_CHECKLIST_INSTANCE = gql`
  mutation CreateChecklistInstance($unitId: UUID!, $stage: ChecklistStage!, $cleaningId: UUID) {
    createChecklistInstance(unitId: $unitId, stage: $stage, cleaningId: $cleaningId) {
      id
      unitId
      cleaningId
      stage
      status
      templateId
      templateVersion
      createdAt
      updatedAt
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const ADD_CHECKLIST_ITEM = gql`
  mutation AddChecklistItem($input: AddItemInput!) {
    addItem(input: $input) {
      id
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const UPDATE_CHECKLIST_ITEM = gql`
  mutation UpdateChecklistItem($input: UpdateItemInput!) {
    updateItem(input: $input) {
      id
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const REMOVE_CHECKLIST_ITEM = gql`
  mutation RemoveChecklistItem($instanceId: UUID!, $itemKey: String!) {
    removeItem(instanceId: $instanceId, itemKey: $itemKey) {
      id
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const PROMOTE_CHECKLIST = gql`
  mutation PromoteChecklist($fromInstanceId: UUID!, $toStage: ChecklistStage!) {
    promoteChecklist(fromInstanceId: $fromInstanceId, toStage: $toStage) {
      id
      unitId
      stage
      status
      templateId
      templateVersion
      parentInstanceId
      createdAt
      updatedAt
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const SUBMIT_CHECKLIST = gql`
  mutation SubmitChecklist($id: UUID!) {
    submitChecklist(id: $id) {
      id
      status
      updatedAt
    }
  }
`

export const LOCK_CHECKLIST = gql`
  mutation LockChecklist($id: UUID!) {
    lockChecklist(id: $id) {
      id
      status
      updatedAt
    }
  }
`

export const ANSWER_CHECKLIST_ITEM = gql`
  mutation AnswerChecklistItem($input: AnswerInput!) {
    answer(input: $input) {
      id
      answers {
        id
        itemKey
        value
        note
        createdAt
        updatedAt
      }
    }
  }
`

export const ATTACH_TO_CHECKLIST_ITEM = gql`
  mutation AttachToChecklistItem($input: AttachmentInput!) {
    attach(input: $input) {
      id
      attachments {
        id
        itemKey
        url
        caption
        createdAt
      }
    }
  }
`

export const GET_CHECKLIST_ATTACHMENT_UPLOAD_URLS = gql`
  mutation GetChecklistAttachmentUploadUrls($input: GetChecklistAttachmentUploadUrlsInput!) {
    getChecklistAttachmentUploadUrls(input: $input) {
      url
      objectKey
      expiresIn
      mimeType
    }
  }
`

export const REMOVE_CHECKLIST_ATTACHMENT = gql`
  mutation RemoveChecklistAttachment($attachmentId: UUID!) {
    removeChecklistAttachment(attachmentId: $attachmentId)
  }
`

// ===== Мутации для редактирования шаблона =====

export const CREATE_CHECKLIST_TEMPLATE = gql`
  mutation CreateChecklistTemplate($unitId: UUID!) {
    createChecklistTemplate(unitId: $unitId) {
      id
      unitId
      version
      createdAt
      updatedAt
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
        exampleMedia {
          id
          url
          objectKey
          caption
          order
        }
      }
    }
  }
`

export const ADD_TEMPLATE_ITEM = gql`
  mutation AddTemplateItem($input: AddTemplateItemInput!) {
    addTemplateItem(input: $input) {
      id
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const UPDATE_TEMPLATE_ITEM = gql`
  mutation UpdateTemplateItem($input: UpdateTemplateItemInput!) {
    updateTemplateItem(input: $input) {
      id
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const REMOVE_TEMPLATE_ITEM = gql`
  mutation RemoveTemplateItem($templateId: UUID!, $itemKey: String!) {
    removeTemplateItem(templateId: $templateId, itemKey: $itemKey) {
      id
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const UPDATE_TEMPLATE_ITEM_ORDER = gql`
  mutation UpdateTemplateItemOrder($templateId: UUID!, $itemKeys: [String!]!) {
    updateTemplateItemOrder(templateId: $templateId, itemKeys: $itemKeys) {
      id
      items {
        id
        key
        title
        description
        type
        required
        requiresPhoto
        photoMin
        order
      }
    }
  }
`

export const GET_TEMPLATE_ITEM_EXAMPLE_MEDIA_UPLOAD_URLS = gql`
  mutation GetTemplateItemExampleMediaUploadUrls($input: GetTemplateItemExampleMediaUploadUrlsInput!) {
    getTemplateItemExampleMediaUploadUrls(input: $input) {
      url
      objectKey
      expiresIn
      mimeType
    }
  }
`

export const ADD_TEMPLATE_ITEM_EXAMPLE_MEDIA = gql`
  mutation AddTemplateItemExampleMedia($input: AddTemplateItemExampleMediaInput!) {
    addTemplateItemExampleMedia(input: $input) {
      id
      url
      objectKey
      mimeType
      caption
      order
    }
  }
`

export const REMOVE_TEMPLATE_ITEM_EXAMPLE_MEDIA = gql`
  mutation RemoveTemplateItemExampleMedia($mediaId: UUID!) {
    removeTemplateItemExampleMedia(mediaId: $mediaId)
  }
`
