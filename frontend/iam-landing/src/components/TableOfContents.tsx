import { Container } from '@/components/Container'
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from '@/components/Expandable'
import { SectionHeading } from '@/components/SectionHeading'

const iamComponents = {
  'Управление пользователями': {
    'Пользователи (User)': 1,
    'Аккаунты (Account)': 8,
    'Профили и настройки': 15,
  },
  'Роли и права': {
    'Роли (Role)': 20,
    'Разрешения (Permission)': 25,
    'Назначение ролей': 30,
    'Иерархия прав': 35,
  },
  'Партнёры и интеграции': {
    'Партнёры (Partner)': 40,
    'API-ключи (ApiKey)': 45,
    'Сессии (AuthSession)': 50,
    'Внешние интеграции': 55,
  },
  'Безопасность и аудит': {
    'Логирование доступа': 60,
    'Аудит действий': 65,
    'Отзыв прав': 70,
    'Мониторинг безопасности': 75,
  },
}

export function TableOfContents() {
  return (
    <section
      id="iam-domain"
      aria-labelledby="iam-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="iam-title">
          Кто есть кто — IAM система
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Управляй и делегируй — чёткое разграничение прав и доступов
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Чтобы бизнес работал как часы, нужно чётко понимать: кто имеет доступ к каким данным, кто за что отвечает 
          и какие права делегированы партнёрам или подрядчикам. IAM-домен отвечает на ключевой вопрос: кто есть кто в твоей экосистеме.
        </p>
        <p className="mt-4 text-lg font-medium tracking-tight text-slate-900">
          IAM-система превращает хаос в порядок — с помощью ролей, прав и прозрачного контроля доступа.
        </p>
        <div className="mt-16 space-y-10 sm:space-y-16">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Что входит в IAM систему
            </h3>
            <ol
              role="list"
              className="mt-8 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
            >
              {[
                { title: '👤 Пользователи (User, Account)', description: 'сотрудники, партнёры, гости, администраторы' },
                { title: '🛡 Роли и права (Role, Permission)', description: 'чёткое разграничение доступа по функциям' },
                { title: '🤝 Партнёры (Partner)', description: 'интеграторы, агенты, подрядчики с собственными ключами' },
                { title: '🔑 API-ключи и сессии (ApiKey, AuthSession)', description: 'безопасный доступ к сервисам и автоматизация процессов' },
                { title: '📊 Аудит и логирование', description: 'каждый доступ фиксируется, каждый ключ можно отозвать' },
                { title: '🔒 Безопасность и контроль', description: 'никто не имеет лишних прав, все действия под контролем' },
                { title: '⚙️ Гибкость настройки', description: 'подстраивай роли под бизнес — от админа до уборщицы' },
                { title: '🌐 Интеграции с доменами', description: 'связь с Finance, Booking, Operations и другими системами' },
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
