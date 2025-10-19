/**
 * Типы для gRPC сервиса уведомлений.
 * Эти типы будут сгенерированы автоматически из .proto файла,
 * но пока определяем их вручную.
 */

export interface NotificationsService {
  SendNotification(request: any): Promise<any>;
  SendBulkNotifications(request: any): Promise<any>;
  GetNotificationStatus(request: any): Promise<any>;
}

