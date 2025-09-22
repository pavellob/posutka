import { Container } from '@/components/Container'
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from '@/components/Expandable'
import { SectionHeading } from '@/components/SectionHeading'

const billingComponents = {
  'Основные сущности': {
    'Invoice (Счёт)': 1,
    'InvoiceItem (Позиция)': 8,
    'Payment (Платёж)': 15,
    'PaymentLink (Ссылка оплаты)': 22,
  },
  'Управление операциями': {
    'Refund (Возврат)': 25,
    'DepositTransaction (Депозит)': 30,
    'Статусы и логи': 35,
    'Интеграции с провайдерами': 40,
  },
  'События и интеграции': {
    'InvoiceCreated/Paid': 45,
    'PaymentRecorded': 50,
    'RefundIssued': 55,
    'DepositActioned': 60,
  },
  'Отчётность и контроль': {
    'Отчётность для владельцев': 65,
    'Метрики успеха': 70,
    'Контроль рисков': 75,
    'Аудит и мониторинг': 80,
  },
}

export function TableOfContents() {
  return (
    <section
      id="billing-domain"
      aria-labelledby="billing-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="billing-title">
          Billing — деньги под контролем
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Прозрачность, контроль движения денег и автоматизация финансов
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Всё, что связано с деньгами: выставление счетов, учёт платежей, возвраты, удержания депозитов, 
          генерация ссылок на оплату. Billing — это «касса» системы, где сходятся гости, владельцы и сервис.
        </p>
        <p className="mt-4 text-lg font-medium tracking-tight text-slate-900">
          Домен «Billing» превращает хаос в порядок — с помощью прозрачности, автоматизации и интеграций с провайдерами.
        </p>
        <div className="mt-16 space-y-10 sm:space-y-16">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Что входит в домен Billing
            </h3>
            <ol
              role="list"
              className="mt-8 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
            >
              {[
                { title: '📄 Invoice (Счёт)', description: 'сумма, валюта, статус: OPEN/PAID/CANCELED' },
                { title: '📋 InvoiceItem (Позиция)', description: 'ночь, уборка, сервисный сбор, налоги' },
                { title: '💳 Payment (Платёж)', description: 'сумма, метод, провайдер, ссылка на чек' },
                { title: '🔗 PaymentLink (Ссылка оплаты)', description: 'с провайдером, сроком действия' },
                { title: '↩ Refund (Возврат)', description: 'возврат по платежу с причиной и логированием' },
                { title: '🔒 DepositTransaction (Депозит)', description: 'удержание, списание или возврат залога' },
                { title: '📊 Статусы и логи', description: 'история изменений, причины, метки инициаторов' },
                { title: '🔌 Интеграции', description: 'Stripe, YooKassa и другие провайдеры платежей' },
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
