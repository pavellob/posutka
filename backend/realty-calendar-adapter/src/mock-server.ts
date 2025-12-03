import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('realty-calendar-mock-server');

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

  cancel_booking: {
    action: 'cancel_booking',
    status: 'cancelled',
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
        status_cd: 6, // Отменен
        created_at: '2025-12-01T17:06:46.007+03:00',
        updated_at: '2025-12-01T19:00:00.000+03:00',
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
              <div>Booking ID: \${data.payload.data?.booking?.id || data.payload.booking?.id}</div>
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

