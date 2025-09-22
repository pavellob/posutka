import { Container } from '@/components/Container'
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from '@/components/Expandable'
import { SectionHeading } from '@/components/SectionHeading'

const objectServiceComponents = {
  'Поиск и фильтрация': {
    'Поиск по критериям': 1,
    'Фильтры по локации': 8,
    'Умные рекомендации': 15,
    'Сохранённые поиски': 22,
  },
  'Управление договорами': {
    'Шаблоны договоров': 25,
    'Автоматизация подписания': 30,
    'Отслеживание статуса': 35,
    'Напоминания и уведомления': 40,
  },
  'Работа с владельцами': {
    'База владельцев': 45,
    'История взаимодействий': 50,
    'Управление отношениями': 55,
    'Отчёты и аналитика': 60,
  },
  'Сети субаренды': {
    'Управление сетями': 65,
    'Координация объектов': 70,
    'Распределение нагрузки': 75,
    'Мониторинг эффективности': 80,
  },
}

export function TableOfContents() {
  return (
    <section
      id="object-service-domain"
      aria-labelledby="object-service-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="object-service-title">
          Сервис объектов — поиск и управление
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Помощник для поисковиков квартир и менеджеров субаренды
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Помогаем людям, которые ищут квартиры для аренды, заключают договоры с владельцами и управляют сетями субаренды. 
          Автоматизируем поиск объектов, упрощаем заключение договоров и обеспечиваем прозрачность в работе с владельцами.
        </p>
        <p className="mt-4 text-lg font-medium tracking-tight text-slate-900">
          Сервис объектов превращает хаос в порядок — с помощью умного поиска, автоматизации договоров и управления отношениями с владельцами.
        </p>
        <div className="mt-16 space-y-10 sm:space-y-16">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Что включает сервис объектов
            </h3>
            <ol
              role="list"
              className="mt-8 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
            >
              {[
                { title: '🔍 Умный поиск квартир', description: 'поиск по критериям, локации, цене и удобствам' },
                { title: '📋 Автоматизация договоров', description: 'шаблоны, электронная подпись, отслеживание статуса' },
                { title: '👥 База владельцев', description: 'контакты, история взаимодействий, предпочтения' },
                { title: '📅 Календарь доступности', description: 'планирование заселений, блокировки, уведомления' },
                { title: '🏢 Управление сетями', description: 'координация объектов, распределение нагрузки' },
                { title: '📊 Аналитика и отчёты', description: 'эффективность поиска, работа с владельцами' },
                { title: '💬 Коммуникации', description: 'интеграция с мессенджерами, автоматические уведомления' },
                { title: '🔒 Безопасность данных', description: 'защита персональных данных, контроль доступа' },
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
