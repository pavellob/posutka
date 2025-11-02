// Экспорт клиентов
export * from './clients/ops.client.js';
export * from './clients/bookings.client.js';
export * from './clients/notifications.client.js';
export * from './clients/cleaning.client.js';
export * from './clients/events.client.js';

// Экспорт фабрик для создания клиентов
export { createNotificationsGrpcClient } from './clients/notifications.client.js';
export { createEventsGrpcClient } from './clients/events.client.js';

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
  BulkNotificationRequest,
  BulkNotificationResponse,
  NotificationStatusRequest,
  NotificationStatusResponse,
  NotificationsServiceDefinition
} from './generated/notifications.js';

// Экспорт сгенерированных типов для cleaning
export {
  Cleaning,
  CleaningStatus,
  ScheduleCleaningRequest,
  GetCleaningRequest,
  UpdateCleaningStatusRequest,
  AssignCleanerRequest,
  CleaningResponse,
  CleaningServiceDefinition
} from './generated/cleaning.js';

// Экспорт сгенерированных типов для events
export {
  EventType as EventsEventType,
  EventStatus as EventsEventStatus,
  PublishEventRequest,
  PublishEventResponse,
  PublishBulkEventsRequest,
  PublishBulkEventsResponse,
  GetEventStatusRequest,
  GetEventStatusResponse,
  EventsServiceDefinition
} from './generated/events.js';

