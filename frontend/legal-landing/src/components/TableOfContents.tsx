import { Container } from '@/components/Container'
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from '@/components/Expandable'
import { SectionHeading } from '@/components/SectionHeading'

const legalComponents = {
  'Основные сущности': {
    'Contract (Договор)': 1,
    'Deposit (Депозит)': 8,
    'DepositTransaction (Транзакция)': 15,
    'Template (Шаблон)': 22,
  },
  'Управление договорами': {
    'AuditLog (Журнал)': 25,
    'ContractGenerated': 30,
    'ContractSigned': 35,
    'Хранение и архивирование': 40,
  },
  'Операции с депозитами': {
    'DepositHeld/Released': 45,
    'DepositCaptured': 50,
    'DepositRefunded': 55,
    'Прозрачность операций': 60,
  },
  'Защита и аудит': {
    'Минимизация конфликтов': 65,
    'Доказательная база': 70,
    'Интеграция с операциями': 75,
    'Мониторинг и отчётность': 80,
  },
}

export function TableOfContents() {
  return (
    <section
      id="legal-domain"
      aria-labelledby="legal-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="legal-title">
          Legal — правовой щит сервиса
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Договоры, депозиты и юридическая защита
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Всё, что связано с юридическими документами, депозитами и правовой прозрачностью: автоматическая генерация договоров, 
          фиксация условий аренды, удержание и возврат залогов.
        </p>
        <p className="mt-4 text-lg font-medium tracking-tight text-slate-900">
          Домен «Legal» превращает хаос в порядок — с помощью автоматических договоров, прозрачных депозитов и юридической защиты.
        </p>
        <div className="mt-16 space-y-10 sm:space-y-16">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Что входит в домен Legal
            </h3>
            <ol
              role="list"
              className="mt-8 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
            >
              {[
                { title: '📄 Contract (Договор)', description: 'id, тип шаблона, стороны, дата подписания, статус' },
                { title: '💰 Deposit (Депозит)', description: 'связка с бронированием, сумма, валюта' },
                { title: '🔄 DepositTransaction (Транзакция)', description: 'действие: HOLD, RELEASE, CAPTURE, REFUND' },
                { title: '📋 Template (Шаблон)', description: 'преднастроенные договорные формы и условия' },
                { title: '📊 AuditLog (Журнал)', description: 'журнал действий: подпись, изменения, депозиты' },
                { title: '⚖ ContractGenerated/Signed', description: 'события создания и подписания договоров' },
                { title: '🔒 DepositHeld/Released', description: 'события удержания и возврата депозитов' },
                { title: '🛡 Минимизация конфликтов', description: 'чёткий регламент действий при ущербе или споре' },
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
