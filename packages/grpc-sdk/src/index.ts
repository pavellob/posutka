// Экспорт клиентов
export * from './clients/ops.client.js';
export * from './clients/bookings.client.js';
export * from './clients/notifications.client.js';

// Экспорт сгенерированных типов для ops
export {
  Task,
  TaskType,
  TaskPriority,
  TaskStatus,
  CreateCleaningTaskRequest,
  GetTaskRequest,
  UpdateTaskStatusRequest,
  AssignTaskRequest,
  GetTasksByPropertyRequest,
  GetTasksByRoomRequest,
  TaskResponse,
  TasksResponse,
  OpsServiceDefinition
} from './generated/ops.js';

// Экспорт сгенерированных типов для bookings
export {
  Booking,
  BookingStatus,
  CreateBookingRequest,
  GetBookingRequest,
  CancelBookingRequest,
  ChangeBookingDatesRequest,
  BookingResponse,
  BookingsServiceDefinition
} from './generated/bookings.js';

// Экспорт сгенерированных типов для notifications
export {
  EventType,
  Priority,
  Channel as NotificationChannel,
  NotificationRequest,
  NotificationResponse,
  NotificationsServiceDefinition
} from './generated/notifications.js';

