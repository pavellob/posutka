import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createGraphQLLogger } from '@repo/shared-logger';
import type { RealtyCalendarWebhook } from './realty-calendar/dto/webhook.dto.js';

const logger = createGraphQLLogger('realty-calendar-mock-server');

// Примеры webhook payload'ов от RealtyCalendar
const mockWebhooks = {
  create_booking: {
    action: 'create_booking',
    status: 'confirmed',
    booking: {
      id: 'rc-booking-001',
      address: 'Москва, ул. Тверская, д. 10, кв. 5',
      begin_date: '2024-12-15',
      end_date: '2024-12-20',
      arrival_time: '14:00',
      departure_time: '11:00',
      amount: 15000,
      prepayment: 5000,
      deposit: 3000,
      realty_id: 'rc-property-001',
      realty_room_id: 'rc-unit-001',
    },
    client: {
      fio: 'Иванов Иван Иванович',
      name: 'Иван Иванов',
      phone: '+79001234567',
      email: 'ivan.ivanov@example.com',
    },
  } as RealtyCalendarWebhook,

  update_booking: {
    action: 'update_booking',
    status: 'confirmed',
    booking: {
      id: 'rc-booking-001',
      address: 'Москва, ул. Тверская, д. 10, кв. 5',
      begin_date: '2024-12-16', // Изменили дату заезда
      end_date: '2024-12-21',   // Изменили дату выезда
      arrival_time: '15:00',
      departure_time: '12:00',
      amount: 18000, // Изменили сумму
      prepayment: 5000,
      deposit: 3000,
      realty_id: 'rc-property-001',
      realty_room_id: 'rc-unit-001',
    },
    client: {
      fio: 'Иванов Иван Иванович',
      name: 'Иван Иванов',
      phone: '+79001234567',
      email: 'ivan.ivanov@example.com',
    },
  } as RealtyCalendarWebhook,

  cancel_booking: {
    action: 'cancel_booking',
    status: 'cancelled',
    booking: {
      id: 'rc-booking-001',
      address: 'Москва, ул. Тверская, д. 10, кв. 5',
      begin_date: '2024-12-15',
      end_date: '2024-12-20',
      arrival_time: '14:00',
      departure_time: '11:00',
      amount: 15000,
      prepayment: 5000,
      deposit: 3000,
      realty_id: 'rc-property-001',
      realty_room_id: 'rc-unit-001',
    },
    client: {
      fio: 'Иванов Иван Иванович',
      name: 'Иван Иванов',
      phone: '+79001234567',
      email: 'ivan.ivanov@example.com',
    },
  } as RealtyCalendarWebhook,

  delete_booking: {
    action: 'delete_booking',
    status: 'deleted',
    booking: {
      id: 'rc-booking-001',
      address: 'Москва, ул. Тверская, д. 10, кв. 5',
      begin_date: '2024-12-15',
      end_date: '2024-12-20',
      arrival_time: '14:00',
      departure_time: '11:00',
      amount: 15000,
      prepayment: 5000,
      deposit: 3000,
      realty_id: 'rc-property-001',
      realty_room_id: 'rc-unit-001',
    },
    client: {
      fio: 'Иванов Иван Иванович',
      name: 'Иван Иванов',
      phone: '+79001234567',
      email: 'ivan.ivanov@example.com',
    },
  } as RealtyCalendarWebhook,

  // Пример без realty_id и realty_room_id (будет создано новое property/unit)
  create_booking_new_property: {
    action: 'create_booking',
    status: 'confirmed',
    booking: {
      id: 'rc-booking-002',
      address: 'Санкт-Петербург, Невский проспект, д. 25, кв. 12',
      begin_date: '2024-12-25',
      end_date: '2024-12-30',
      arrival_time: '15:00',
      departure_time: '11:00',
      amount: 20000,
      prepayment: 7000,
      deposit: 5000,
    },
    client: {
      fio: 'Петрова Мария Сергеевна',
      name: 'Мария Петрова',
      phone: '+79009876543',
      email: 'maria.petrova@example.com',
    },
  } as RealtyCalendarWebhook,
};

async function sendWebhook(url: string, payload: RealtyCalendarWebhook): Promise<void> {
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
      bookingId: payload.booking.id,
      status: response.status,
      result,
    });
  } catch (error: any) {
    logger.error('Failed to send webhook', {
      action: payload.action,
      bookingId: payload.booking.id,
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
  <button class="button" onclick="sendWebhook('create_booking')">📝 Create Booking</button>
  <button class="button" onclick="sendWebhook('update_booking')">✏️ Update Booking</button>
  <button class="button" onclick="sendWebhook('cancel_booking')">❌ Cancel Booking</button>
  <button class="button" onclick="sendWebhook('delete_booking')">🗑️ Delete Booking</button>
  <button class="button" onclick="sendWebhook('create_booking_new_property')">🆕 Create Booking (New Property)</button>
  
  <div id="result"></div>

  <script>
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
          resultDiv.innerHTML = \`
            <div class="result success">
              <strong>✅ Успешно отправлено!</strong>
              <div>Action: \${data.payload.action}</div>
              <div>Booking ID: \${data.payload.booking.id}</div>
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

        const payload = mockWebhooks[type as keyof typeof mockWebhooks];
        const response = await sendWebhookAndGetResponse(targetUrl, payload);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          payload,
          response,
        }));
      } catch (error: any) {
        logger.error('Failed to send webhook', { error: error.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
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
  payload: RealtyCalendarWebhook
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

