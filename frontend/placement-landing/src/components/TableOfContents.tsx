import { Container } from '@/components/Container'
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from '@/components/Expandable'
import { SectionHeading } from '@/components/SectionHeading'

const placementComponents = {
  'Основные сущности': {
    'Channel (Канал)': 1,
    'Listing (Объявление)': 8,
    'ChannelMapping (Маппинг)': 15,
    'RatePlan (Тарифный план)': 22,
  },
  'Управление синхронизацией': {
    'SyncJob (Синхронизация)': 25,
    'ContentBundle (Контент)': 30,
    'Автоматические задания': 35,
    'Обновление цен и доступности': 40,
  },
  'Интеграции и события': {
    'Property → Placement': 45,
    'Finance → Placement': 50,
    'Booking ↔ Placement': 55,
    'Синхронизация календарей': 60,
  },
  'Контроль и мониторинг': {
    'Предотвращение овербукингов': 65,
    'Мониторинг синхронизации': 70,
    'Аналитика по каналам': 75,
    'Управление контентом': 80,
  },
}

export function TableOfContents() {
  return (
    <section
      id="placement-domain"
      aria-labelledby="placement-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="placement-title">
          Placement — размещение и дистрибуция
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Единый центр управления всеми каналами
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Airbnb, Booking.com, собственный сайт — десятки каналов, разные правила, разные комиссии. 
          Один клик — и ваши цены, фото и правила доступны на всех площадках.
        </p>
        <p className="mt-4 text-lg font-medium tracking-tight text-slate-900">
          Домен «Placement» превращает хаос в порядок — с помощью централизованного управления и автоматической синхронизации.
        </p>
        <div className="mt-16 space-y-10 sm:space-y-16">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Что входит в домен Placement
            </h3>
            <ol
              role="list"
              className="mt-8 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
            >
              {[
                { title: '🌐 Channel (Канал)', description: 'список подключённых площадок: Airbnb, Booking.com, Ostrovok' },
                { title: '🏡 Listing (Объявление)', description: 'единая карточка объекта, транслируемая во все каналы' },
                { title: '🔗 ChannelMapping (Маппинг)', description: 'привязка юнитов и объектов к каналам' },
                { title: '💸 RatePlan (Тарифный план)', description: 'базовые цены, скидки, правила отмены' },
                { title: '🔄 SyncJob (Синхронизация)', description: 'автоматические задания для обновления цен и контента' },
                { title: '📦 ContentBundle (Контент)', description: 'фотографии, описания, удобства для всех каналов' },
                { title: '📅 Синк календарей', description: 'предотвращение овербукингов через единый календарь' },
                { title: '📊 Аналитика по каналам', description: 'мониторинг производительности и конверсии' },
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
