import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GET_NOTIFICATIONS, MARK_AS_READ, MARK_ALL_AS_READ } from '@/lib/graphql-queries';

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  eventType: string;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  readAt?: string;
}

interface UseNotificationsOptions {
  userId: string;
  enableWebSocket?: boolean;
  wsEndpoint?: string;
}

/**
 * Hook для работы с уведомлениями.
 * Поддерживает GraphQL queries и WebSocket для real-time.
 */
export function useNotifications({ 
  userId, 
  enableWebSocket = true,
  wsEndpoint = 'ws://localhost:4020' 
}: UseNotificationsOptions) {
  const [realtimeNotifications, setRealtimeNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  
  // Запрос уведомлений из БД
  const { data: notificationsData, isLoading, refetch } = useQuery<any>({
    queryKey: ['notifications', userId],
    queryFn: () => graphqlClient.request(GET_NOTIFICATIONS, {
      userId,
      unreadOnly: false,
      first: 50,
    }),
    enabled: !!userId,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });
  
  // Мутация для отметки как прочитанное
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => graphqlClient.request(MARK_AS_READ, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  
  // Мутация для отметки всех как прочитанные
  const markAllAsReadMutation = useMutation({
    mutationFn: () => graphqlClient.request(MARK_ALL_AS_READ, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setRealtimeNotifications([]);
    },
  });
  
  // WebSocket подключение для real-time уведомлений
  useEffect(() => {
    if (!enableWebSocket || !userId) return;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsEndpoint);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected to notifications service');
          setConnected(true);
          
          // Подписываемся на уведомления пользователя
          ws.send(JSON.stringify({
            type: 'subscribe',
            userId,
            events: [
              'CLEANING_ASSIGNED',
              'CLEANING_STARTED',
              'CLEANING_COMPLETED',
              'CLEANING_CANCELLED',
              'TASK_ASSIGNED',
              'TASK_COMPLETED',
              'BOOKING_CREATED',
              'BOOKING_CONFIRMED',
              'PAYMENT_RECEIVED',
            ],
          }));
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'notification') {
              const notification = data.data;
              
              console.log('📨 Real-time notification received:', notification);
              
              // Добавляем в список real-time уведомлений
              setRealtimeNotifications(prev => [notification, ...prev].slice(0, 10));
              
              // Обновляем кэш GraphQL
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } else if (data.type === 'subscription_ack') {
              console.log('✅ Subscribed to notifications:', data);
            } else if (data.type === 'connection_ack') {
              console.log('✅ Connection acknowledged:', data.message);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected, reconnecting...');
          setConnected(false);
          
          // Переподключаемся через 3 секунды
          setTimeout(() => {
            if (enableWebSocket) {
              connectWebSocket();
            }
          }, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };
    
    connectWebSocket();
    
    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userId, enableWebSocket, wsEndpoint, queryClient]);
  
  // Ping-pong для keep-alive
  useEffect(() => {
    if (!connected || !wsRef.current) return;
    
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Каждые 30 секунд
    
    return () => clearInterval(interval);
  }, [connected]);
  
  // Объединяем уведомления из БД и real-time
  const notifications = notificationsData?.notifications?.edges?.map((edge: any) => edge.node) || [];
  const allNotifications = [...realtimeNotifications, ...notifications];
  
  // Убираем дубликаты по ID
  const uniqueNotifications = allNotifications.filter(
    (notification, index, self) =>
      index === self.findIndex((n) => n.id === notification.id)
  );
  
  // Считаем непрочитанные
  const unreadCount = uniqueNotifications.filter(n => !n.readAt).length;
  
  // Методы
  const markAsRead = useCallback((id: string) => {
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);
  
  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);
  
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);
  
  return {
    notifications: uniqueNotifications,
    unreadCount,
    connected,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}

