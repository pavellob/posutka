import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('realty-calendar-mock-server');

// Сохраняем последнее созданное бронирование для отмены
let lastCreatedBooking: {
  id: string | number;
  bookingData: any;
  clientData: any;
  createdAt: Date;
} | null = null;

// Счетчик для генерации уникальных ID
let bookingIdCounter = 135376340;

// Примеры webhook payload'ов от RealtyCalendar (в реальном формате с оберткой data)
const mockWebhooks = {
  create_booking: {
    action: 'create_booking',
    status: 'booked',
    data: {
      booking: {
        id: 135376340,
        begin_date: '2025-12-06',
        end_date: '2025-12-10',
        realty_id: 302285,
        realty_room_id: null,
        user_id: 34892,
        address: 'воронцовский 19к1',
        amount: 7000.0,
        prepayment: 0,
        deposit: null,
        arrival_time: null,
        departure_time: null,
        status_cd: 5,
        created_at: '2025-12-01T17:06:46.007+03:00',
        updated_at: '2025-12-01T17:07:03.350+03:00',
        canceled_date: null,
        notes: null,
        apartment: {
          id: 302285,
          title: 'а16 . 1540 Воронцовский 19 студия',
          address: 'Мурино, воронцовский 19к1',
        },
        booking_origin: {
          id: null,
          title: null,
        },
      },
      crm_entity_id: null,
      bitrix_lead_id: null,
    },
    client: {
      fio: 'Иванов Иван Иванович',
      name: 'Иван Иванов',
      phone: '+79001234567',
      email: 'ivan.ivanov@example.com',
    },
  },

  // Дефолтный payload для обновления, если нет сохраненного бронирования
  update_booking: {
    action: 'update_booking',
    status: 'booked',
    data: {
      booking: {
        id: 135376340,
        begin_date: '2025-12-07', // Изменили дату заезда
        end_date: '2025-12-11',   // Изменили дату выезда
        realty_id: 302285,
        realty_room_id: null,
        user_id: 34892,
        address: 'воронцовский 19к1',
        amount: 8000.0, // Изменили сумму
        prepayment: 1000,
        deposit: null,
        arrival_time: '15:00',
        departure_time: '12:00',
        status_cd: 5,
        created_at: '2025-12-01T17:06:46.007+03:00',
        updated_at: '2025-12-01T18:00:00.000+03:00',
        canceled_date: null,
        notes: 'Обновлено через webhook',
        apartment: {
          id: 302285,
          title: 'а16 . 1540 Воронцовский 19 студия',
          address: 'Мурино, воронцовский 19к1',
        },
        booking_origin: {
          id: null,
          title: null,
        },
      },
      crm_entity_id: null,
      bitrix_lead_id: null,
    },
    client: {
      fio: 'Иванов Иван Иванович',
      name: 'Иван Иванов',
      phone: '+79001234567',
      email: 'ivan.ivanov@example.com',
    },
  },

  // Отменяет то же бронирование, которое было создано через create_booking (id: 135376340)
  cancel_booking: {
    action: 'cancel_booking',
    status: 'canceled',
    data: {
      booking: {
        id: 135376340, // Тот же ID, что и в create_booking
        begin_date: '2025-12-06', // Те же даты, что и в create_booking
        end_date: '2025-12-10', // Те же даты, что и в create_booking
        realty_id: 302285,
        realty_room_id: null,
        user_id: 34892,
        address: 'воронцовский 19к1',
        amount: 7000.0,
        prepayment: 0,
        deposit: null,
        arrival_time: null,
        departure_time: null,
        status_cd: 3, // Отменен
        created_at: '2025-12-01T17:06:46.007+03:00', // Та же дата создания, что и в create_booking
        updated_at: '2025-12-05T07:24:28.028+03:00', // Обновлено время отмены
        canceled_date: '2025-12-05', // Дата отмены
        notes: 'Отменено по запросу клиента', // Причина отмены
        apartment: {
          id: 302285,
          title: 'а16 . 1540 Воронцовский 19 студия',
          address: 'Мурино, воронцовский 19к1',
        },
        booking_origin: {
          id: null,
          title: null,
        },
        // В cancel_booking клиент находится внутри booking
        client: {
          id: 40917281,
          fio: 'Иванов Иван Иванович', // Те же данные клиента, что и в create_booking
          name: 'Иван Иванов',
          phone: '+79001234567',
          email: 'ivan.ivanov@example.com',
        },
      },
      crm_entity_id: null,
      bitrix_lead_id: null,
    },
  },

  delete_booking: {
    action: 'delete_booking',
    status: 'deleted',
    data: {
      booking: {
        id: 135376340,
        begin_date: '2025-12-06',
        end_date: '2025-12-10',
        realty_id: 302285,
        realty_room_id: null,
        user_id: 34892,
        address: 'воронцовский 19к1',
        amount: 7000.0,
        prepayment: 0,
        deposit: null,
        arrival_time: null,
        departure_time: null,
        status_cd: 6,
        created_at: '2025-12-01T17:06:46.007+03:00',
        updated_at: '2025-12-01T20:00:00.000+03:00',
        canceled_date: null,
        notes: null,
        apartment: {
          id: 302285,
          title: 'а16 . 1540 Воронцовский 19 студия',
          address: 'Мурино, воронцовский 19к1',
        },
        booking_origin: {
          id: null,
          title: null,
        },
      },
      crm_entity_id: null,
      bitrix_lead_id: null,
    },
    client: {
      fio: 'Иванов Иван Иванович',
      name: 'Иван Иванов',
      phone: '+79001234567',
      email: 'ivan.ivanov@example.com',
    },
  },

  // Пример без realty_id и realty_room_id (будет создано новое property/unit)
  create_booking_new_property: {
    action: 'create_booking',
    status: 'booked',
    data: {
      booking: {
        id: 135376341,
        begin_date: '2025-12-25',
        end_date: '2025-12-30',
        realty_id: null, // Новое property будет создано
        realty_room_id: null,
        user_id: 34893,
        address: 'Санкт-Петербург, Невский проспект, д. 25, кв. 12',
        amount: 20000.0,
        prepayment: 7000,
        deposit: 5000,
        arrival_time: '15:00',
        departure_time: '11:00',
        status_cd: 5,
        created_at: '2025-12-01T18:00:00.000+03:00',
        updated_at: '2025-12-01T18:00:00.000+03:00',
        canceled_date: null,
        notes: null,
        apartment: null,
        booking_origin: {
          id: null,
          title: null,
        },
      },
      crm_entity_id: null,
      bitrix_lead_id: null,
    },
    client: {
      fio: 'Петрова Мария Сергеевна',
      name: 'Мария Петрова',
      phone: '+79009876543',
      email: 'maria.petrova@example.com',
    },
  },
};

/**
 * Генерирует payload для обновления бронирования на основе сохраненного бронирования
 */
function generateUpdateBookingPayload(savedBooking: { 
  id: string | number; 
  bookingData: any; 
  clientData: any;
}): any {
  const now = new Date();
  
  // Обновляем даты на +1 день от исходных
  const originalBeginDate = new Date(savedBooking.bookingData.begin_date);
  const originalEndDate = new Date(savedBooking.bookingData.end_date);
  
  originalBeginDate.setDate(originalBeginDate.getDate() + 1);
  originalEndDate.setDate(originalEndDate.getDate() + 1);
  
  const newBeginDate = originalBeginDate.toISOString().split('T')[0];
  const newEndDate = originalEndDate.toISOString().split('T')[0];
  
  // Увеличиваем сумму на 1000
  const newAmount = (savedBooking.bookingData.amount || 0) + 1000;

  return {
    action: 'update_booking',
    status: 'booked',
    data: {
      booking: {
        ...savedBooking.bookingData,
        id: savedBooking.id, // Важно: используем тот же ID, что был при создании, для связи при отмене
        begin_date: newBeginDate,
        end_date: newEndDate,
        amount: newAmount,
        prepayment: savedBooking.bookingData.prepayment || 0,
        arrival_time: '15:00',
        departure_time: '12:00',
        status_cd: 5, // Подтверждено
        updated_at: now.toISOString(),
        canceled_date: null,
        notes: savedBooking.bookingData.notes || 'Обновлено через RealtyCalendar webhook',
      },
      crm_entity_id: null,
      bitrix_lead_id: null,
    },
    client: savedBooking.clientData || {
      name: 'Guest',
    },
  };
}

/**
 * Генерирует payload для отмены бронирования на основе сохраненного бронирования
 */
function generateCancelBookingPayload(savedBooking: { 
  id: string | number; 
  bookingData: any; 
  clientData: any;
}): any {
  const now = new Date();
  const canceledDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Формируем клиента для cancel_booking (может быть null в email/phone)
  const client = savedBooking.clientData || {
    fio: 'Guest',
    name: 'Guest',
    phone: null,
    email: null,
  };

  return {
    action: 'cancel_booking',
    status: 'canceled',
    data: {
      booking: {
        ...savedBooking.bookingData,
        id: savedBooking.id, // Используем актуальный ID последнего созданного бронирования для отмены
        status_cd: 3, // Отменен
        updated_at: now.toISOString(),
        canceled_date: canceledDate,
        notes: savedBooking.bookingData.notes || 'Отменено по запросу клиента',
        // В cancel_booking клиент находится внутри booking
        client: {
          id: client.id || undefined,
          fio: client.fio,
          name: client.name,
          phone: client.phone || null,
          email: client.email || null,
        },
      },
      crm_entity_id: null,
      bitrix_lead_id: null,
    },
  };
}

async function sendWebhook(url: string, payload: any): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    logger.info('Webhook sent', {
      action: payload.action,
      bookingId: payload.data?.booking?.id || payload.booking?.id,
      status: response.status,
      result,
    });
  } catch (error: any) {
    logger.error('Failed to send webhook', {
      action: payload.action,
      bookingId: payload.data?.booking?.id || payload.booking?.id,
      error: error.message,
    });
  }
}

function startMockServer(port: number, targetUrl: string) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Главная страница с UI для отправки webhook'ов
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RealtyCalendar Mock Server</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .button:hover { background: #0056b3; }
    .button:disabled { background: #ccc; cursor: not-allowed; }
    .result { margin-top: 20px; padding: 15px; border-radius: 4px; background: #f8f9fa; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; }
    .error { background: #f8d7da; border: 1px solid #f5c6cb; }
    .payload { margin-top: 10px; padding: 10px; background: white; border-radius: 4px; font-family: monospace; font-size: 12px; overflow-x: auto; }
    h1 { color: #333; }
    .info { background: #e7f3ff; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .info strong { display: block; margin-bottom: 5px; }
  </style>
</head>
<body>
  <h1>🏠 RealtyCalendar Mock Server</h1>
  <div class="info">
    <strong>Target URL:</strong> ${targetUrl}
    <strong>Mock Server:</strong> http://localhost:${port}
  </div>
  
  <h2>Отправить Webhook</h2>
  <div id="last-booking-info" style="color: #666; font-size: 14px; margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
    💡 <strong>Информация:</strong> <span id="last-booking-text">Создайте бронирование, чтобы начать работу</span>
  </div>
  <button class="button" onclick="sendWebhook('create_booking')">📝 Create Booking</button>
  <button class="button" onclick="sendWebhook('update_booking')">✏️ Update Booking</button>
  <button class="button" onclick="sendWebhook('cancel_booking')">❌ Cancel Booking</button>
  <button class="button" onclick="sendWebhook('delete_booking')">🗑️ Delete Booking</button>
  <button class="button" onclick="sendWebhook('create_booking_new_property')">🆕 Create Booking (New Property)</button>
  
  <div id="result"></div>

  <script>
    // Обновляем информацию о последнем бронировании
    async function updateLastBookingInfo() {
      try {
        const response = await fetch('/last-booking');
        const data = await response.json();
        const infoDiv = document.getElementById('last-booking-text');
        
        if (data.lastCreatedBooking) {
          infoDiv.innerHTML = \`Последнее созданное бронирование: <strong>ID \${data.lastCreatedBooking.id}</strong>. <br>При каждом Create Booking будет генерироваться новый уникальный ID. <br>Update и Cancel будут использовать актуальный ID последнего созданного бронирования.\`;
        } else {
          infoDiv.innerHTML = 'Создайте бронирование, чтобы начать работу. <br>При каждом Create Booking будет генерироваться новый уникальный ID. <br>Update и Cancel будут использовать актуальный ID последнего созданного бронирования.';
        }
      } catch (error) {
        console.error('Failed to fetch last booking info', error);
      }
    }
    
    // Загружаем информацию при загрузке страницы
    updateLastBookingInfo();
    
    async function sendWebhook(type) {
      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = '<div class="result">Отправка...</div>';
      
      try {
        const response = await fetch('/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Обновляем информацию о последнем бронировании
          if (type === 'create_booking' || type === 'create_booking_new_property') {
            await updateLastBookingInfo();
          }
          
          const bookingId = data.payload.data?.booking?.id || data.payload.booking?.id;
          const lastBookingId = data.lastCreatedBookingId;
          
          resultDiv.innerHTML = \`
            <div class="result success">
              <strong>✅ Успешно отправлено!</strong>
              <div>Action: \${data.payload.action}</div>
              <div>Booking ID: \${bookingId}</div>
              \${lastBookingId ? \`<div>Последнее сохраненное бронирование: <strong>\${lastBookingId}</strong></div>\` : ''}
              <div>Response Status: \${data.response.status}</div>
              <details style="margin-top: 10px;">
                <summary>Response Body</summary>
                <pre class="payload">\${JSON.stringify(data.response.body, null, 2)}</pre>
              </details>
              <details style="margin-top: 10px;">
                <summary>Payload</summary>
                <pre class="payload">\${JSON.stringify(data.payload, null, 2)}</pre>
              </details>
            </div>
          \`;
        } else {
          resultDiv.innerHTML = \`
            <div class="result error">
              <strong>❌ Ошибка:</strong> \${data.error}
            </div>
          \`;
        }
      } catch (error) {
        resultDiv.innerHTML = \`
          <div class="result error">
            <strong>❌ Ошибка:</strong> \${error.message}
          </div>
        \`;
      }
    }
  </script>
</body>
</html>
      `);
      return;
    }

    // Endpoint для отправки webhook'а
    if (req.method === 'POST' && req.url === '/send') {
      try {
        const body = await readBody(req);
        const { type } = JSON.parse(body);

        if (!type || !mockWebhooks[type as keyof typeof mockWebhooks]) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid webhook type' }));
          return;
        }

        // Получаем payload (динамически генерируем для cancel_booking и update_booking)
        let payload: any;
        if (type === 'cancel_booking') {
          if (lastCreatedBooking) {
            // Используем сохраненное бронирование для отмены (с тем же ID)
            payload = generateCancelBookingPayload(lastCreatedBooking);
            logger.info('Using actual ID from last created booking for cancellation', {
              bookingId: lastCreatedBooking.id,
              note: 'Using the actual ID that was generated during the last create_booking',
            });
          } else {
            // Если нет сохраненного бронирования, используем дефолтный payload
            logger.warn('No saved booking found, using default cancel_booking payload');
            payload = { ...mockWebhooks.cancel_booking };
          }
        } else if (type === 'update_booking') {
          if (lastCreatedBooking) {
            // Используем сохраненное бронирование для обновления (с тем же ID)
            payload = generateUpdateBookingPayload(lastCreatedBooking);
            logger.info('Using saved booking for update with same ID', {
              bookingId: lastCreatedBooking.id,
              note: 'ID remains the same as in create_booking',
            });
          } else {
            // Если нет сохраненного бронирования, используем дефолтный payload
            logger.warn('No saved booking found, using default update_booking payload');
            payload = { ...mockWebhooks.update_booking };
          }
        } else {
          payload = { ...mockWebhooks[type as keyof typeof mockWebhooks] };
        }

        // Сохраняем созданное бронирование (сохраняем ID для последующих update и cancel)
        if (type === 'create_booking' || type === 'create_booking_new_property') {
          // Генерируем новый уникальный ID для каждого создания
          bookingIdCounter += 1;
          const newBookingId = bookingIdCounter;
          
          // Обновляем ID в payload на новый
          if (payload.data?.booking) {
            payload.data.booking.id = newBookingId;
          } else if (payload.booking) {
            payload.booking.id = newBookingId;
          }
          
          const bookingId = payload.data?.booking?.id || payload.booking?.id;
          if (bookingId) {
            // Извлекаем клиента - может быть на верхнем уровне или внутри data.booking.client
            const bookingDataRaw = payload.data?.booking || payload.booking;
            const clientData = payload.client || (bookingDataRaw as any)?.client;
            
            // Убираем клиента из bookingData, чтобы не дублировать его при генерации cancel_booking
            const { client: _, ...bookingDataWithoutClient } = bookingDataRaw as any;
            
            lastCreatedBooking = {
              id: bookingId, // Сохраняем новый ID - он будет использован для update и cancel
              bookingData: bookingDataWithoutClient,
              clientData: clientData,
              createdAt: new Date(),
            };
            logger.info('Generated new booking ID and saved for future updates/cancellations', {
              bookingId: newBookingId,
              type,
              hasClient: !!payload.client,
              note: 'This ID will be used for update_booking and cancel_booking',
            });
          }
        }

        const response = await sendWebhookAndGetResponse(targetUrl, payload);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          payload,
          response,
          lastCreatedBookingId: lastCreatedBooking?.id || null,
        }));
      } catch (error: any) {
        logger.error('Failed to send webhook', { error: error.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return;
    }

    // Endpoint для получения последнего созданного бронирования
    if (req.method === 'GET' && req.url === '/last-booking') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        lastCreatedBooking: lastCreatedBooking ? {
          id: lastCreatedBooking.id,
          createdAt: lastCreatedBooking.createdAt,
        } : null,
      }));
      return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', targetUrl }));
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    logger.info(`RealtyCalendar Mock Server started on port ${port}`);
    logger.info(`Target URL: ${targetUrl}`);
    logger.info(`Web UI: http://localhost:${port}/`);
    logger.info(`Health check: http://localhost:${port}/health`);
  });

  return server;
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

async function sendWebhookAndGetResponse(
  url: string,
  payload: any
): Promise<{ status: number; body: any }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));

    return {
      status: response.status,
      body,
    };
  } catch (error: any) {
    throw new Error(`Failed to send webhook: ${error.message}`);
  }
}

// Запуск мок-сервера
// Проверяем, что файл запущен напрямую (не импортирован)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('mock-server.ts') ||
                     process.argv[1]?.endsWith('mock-server.js');

if (isMainModule) {
  const PORT = parseInt(process.env.REALTY_CALENDAR_MOCK_SERVER_PORT || '5101');
  const TARGET_URL = process.env.REALTY_CALENDAR_TARGET_URL || 'http://localhost:4201/webhooks/realty-calendar';

  startMockServer(PORT, TARGET_URL);

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down mock server...');
    process.exit(0);
  });
}

export { startMockServer, mockWebhooks, sendWebhook };

