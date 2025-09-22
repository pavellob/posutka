import Image from 'next/image'

import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import abstractBackgroundImage from '@/images/resources/abstract-background.png'
import discordImage from '@/images/resources/discord.svg'
import figmaImage from '@/images/resources/figma.svg'
import videoPlayerImage from '@/images/resources/video-player.svg'

const benefits = [
  {
    title: 'Безопасность',
    description:
      'Никто не имеет лишних прав. Чёткое разграничение доступа защищает конфиденциальные данные.',
    icon: '🔒',
    color: 'bg-red-500',
  },
  {
    title: 'Простое делегирование',
    description:
      'Добавляй партнёров и команду без сложностей. Гибкие роли под любой бизнес-процесс.',
    icon: '📌',
    color: 'bg-blue-500',
  },
  {
    title: 'Аудит и прозрачность',
    description:
      'Каждый доступ фиксируется, каждый ключ можно отозвать. Полная видимость действий.',
    icon: '📊',
    color: 'bg-purple-500',
  },
  {
    title: 'Гибкость настройки',
    description:
      'Подстраивай роли под бизнес — от системного администратора до уборщицы.',
    icon: '⚙️',
    color: 'bg-green-500',
  },
  {
    title: 'Интеграции с доменами',
    description:
      'Связь с Finance, Booking, Operations. Единая точка управления доступом ко всем системам.',
    icon: '🌐',
    color: 'bg-orange-500',
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
          Конкретные выгоды от управления пользователями и доступами
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          IAM-система «Кто есть кто» не просто управляет доступом — она кардинально меняет 
          безопасность, прозрачность и масштабируемость бизнеса.
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
