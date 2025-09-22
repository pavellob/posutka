import { Container } from '@/components/Container'
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from '@/components/Expandable'
import { SectionHeading } from '@/components/SectionHeading'

const bookingComponents = {
  'Основные сущности': {
    'Booking (Бронирование)': 1,
    'Guest (Гость)': 8,
    'PriceBreakdown (Цена)': 15,
    'Payment/Invoice (Платёж)': 22,
  },
  'Управление статусами': {
    'Deposit (Депозит)': 25,
    'Cancellation (Отмена)': 30,
    'Check-in/Check-out': 35,
    'Логи изменений': 40,
  },
  'Интеграции и события': {
    'BookingCreated/Canceled': 45,
    'Синхронизация с каналами': 50,
    'Связка с финансами': 55,
    'Автоматизация операций': 60,
  },
  'Прозрачность и контроль': {
    'Отчётность для владельцев': 65,
    'Метрики успеха': 70,
    'Контроль овербукингов': 75,
    'Аудит и мониторинг': 80,
  },
}

export function TableOfContents() {
  return (
    <section
      id="booking-domain"
      aria-labelledby="booking-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="booking-title">
          Бронирования — ядро операций
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Единый источник правды о заездах и прозрачности доходов
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Все процессы, связанные с заказами гостей: создание, подтверждение, отмена, перенос дат, статусы, гости, цены, депозиты. 
          Бронирование — это «золотая запись», от которой пляшут финансы, клининг и каналы.
        </p>
        <p className="mt-4 text-lg font-medium tracking-tight text-slate-900">
          Домен «Бронирования» превращает хаос в порядок — с помощью единого источника правды, автоматической синхронизации и прозрачности доходов.
        </p>
        <div className="mt-16 space-y-10 sm:space-y-16">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Что входит в домен Бронирования
            </h3>
            <ol
              role="list"
              className="mt-8 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
            >
              {[
                { title: '📅 Booking (Бронирование)', description: 'заказ с полями: статус, даты, гости, цена, источник' },
                { title: '👤 Guest (Гость)', description: 'данные гостя: имя, email, телефон, предпочтения' },
                { title: '💰 PriceBreakdown (Цена)', description: 'структура цены: базовая, уборка, сервис, налоги' },
                { title: '💳 Payment/Invoice (Платёж)', description: 'связанные счета и платежи, депозиты' },
                { title: '🔒 Deposit (Депозит)', description: 'залоговые операции: hold, release, refund' },
                { title: '❌ Cancellation (Отмена)', description: 'отмена с причиной и меткой инициатора' },
                { title: '🏠 Check-in/Check-out', description: 'факт заезда/выезда с автоматическими уведомлениями' },
                { title: '📊 Логи и аудит', description: 'история изменений, причины отмен, метрики успеха' },
              ].map((item, index) => (
                <li
                  key={item.title}
                  className="flex justify-between py-3"
                  aria-label={`${item.title}: ${item.description}`}
                >
                  <div className="flex-1">
                    <span className="font-medium text-slate-900">
                      {item.title}
                    </span>
                    <span className="ml-2 text-slate-600">
                      — {item.description}
                    </span>
                  </div>
                  <span
                    className="font-mono text-slate-400 ml-4"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  )
}
