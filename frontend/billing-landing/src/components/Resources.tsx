import Image from 'next/image'

import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import abstractBackgroundImage from '@/images/resources/abstract-background.png'
import discordImage from '@/images/resources/discord.svg'
import figmaImage from '@/images/resources/figma.svg'
import videoPlayerImage from '@/images/resources/video-player.svg'

const benefits = [
  {
    title: 'Прозрачность для гостей',
    description:
      'Гость всегда видит, за что и сколько платит. Чёткие счета и автоматические ссылки на оплату.',
    icon: '👁',
    color: 'bg-blue-500',
  },
  {
    title: 'Контроль движения денег',
    description:
      'Все транзакции фиксируются и связаны с бронированиями. Полная трассируемость операций.',
    icon: '💰',
    color: 'bg-green-500',
  },
  {
    title: 'Интеграции с провайдерами',
    description:
      'Stripe, YooKassa и другие. Автоматическая обработка платежей и уведомления о статусах.',
    icon: '🔌',
    color: 'bg-purple-500',
  },
  {
    title: 'Управление рисками',
    description:
      'Депозиты, частичные возвраты, подтверждённые статусы. Защита от фрода и чарджбеков.',
    icon: '🛡',
    color: 'bg-orange-500',
  },
  {
    title: 'Простая отчётность',
    description:
      'Сверка начислений и выплат для владельцев. Автоматические отчёты и аналитика.',
    icon: '📊',
    color: 'bg-pink-500',
  },
]

export function Resources() {
  return (
    <section
      id="benefits"
      aria-labelledby="benefits-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="3" id="benefits-title">
          Преимущества
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Конкретные выгоды от автоматизации финансовых операций
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Домен «Billing» не просто управляет платежами — он кардинально меняет 
          прозрачность финансов и надёжность денежных потоков.
        </p>
      </Container>
      <Container size="lg" className="mt-16">
        <ol
          role="list"
          className="-mx-3 grid grid-cols-1 gap-y-10 lg:grid-cols-3 lg:text-center xl:-mx-12 xl:divide-x xl:divide-slate-400/20"
        >
          {benefits.map((benefit, index) => (
            <li
              key={benefit.title}
              className="grid auto-rows-min grid-cols-1 items-center gap-8 px-3 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-1 xl:px-12"
            >
              <div className="relative h-48 overflow-hidden rounded-2xl shadow-lg sm:h-60 lg:h-40 flex items-center justify-center">
                <div className={`w-24 h-24 ${benefit.color} rounded-full flex items-center justify-center text-4xl`}>
                  {benefit.icon}
                </div>
              </div>
              <div>
                <h3 className="text-base font-medium tracking-tight text-slate-900">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {benefit.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
