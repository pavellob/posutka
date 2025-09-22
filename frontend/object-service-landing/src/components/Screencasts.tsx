import Image from 'next/image'

import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import duotoneImage from '@/images/screencasts/duotone.svg'
import gridsImage from '@/images/screencasts/grids.svg'
import setupImage from '@/images/screencasts/setup.svg'
import strokesImage from '@/images/screencasts/strokes.svg'

const examples = [
  {
    title: 'Быстрый поиск квартиры',
    description:
      'Клиент ищет 2-комнатную квартиру в центре за 50k. Система находит 15 подходящих вариантов за 2 минуты, автоматически связывается с владельцами.',
    icon: '🔍',
    runtime: { minutes: 2, seconds: 30 },
  },
  {
    title: 'Автоматизация договора',
    description:
      'Владелец согласился сдать квартиру. Система генерирует договор, отправляет на электронную подпись, отслеживает статус.',
    icon: '📋',
    runtime: { minutes: 1, seconds: 45 },
  },
  {
    title: 'Управление сетью субаренды',
    description:
      'Менеджер сети из 50 объектов видит загрузку каждого, перераспределяет клиентов, контролирует качество обслуживания.',
    icon: '🏢',
    runtime: { minutes: 3, seconds: 0 },
  },
  {
    title: 'Работа с владельцами',
    description:
      'Система напоминает владельцу о предстоящем заселении, автоматически согласовывает время, ведёт историю взаимодействий.',
    icon: '👥',
    runtime: { minutes: 2, seconds: 0 },
  },
]

function PlayIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      aria-hidden="true"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      {...props}
    >
      <path d="M6.75 10.25v-4.5L10.25 8l-3.5 2.25Z" />
      <circle cx="8" cy="8" r="6.25" fill="none" />
    </svg>
  )
}

export function Screencasts() {
  return (
    <section
      id="examples"
      aria-labelledby="examples-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="2" id="examples-title">
          Примеры из практики
        </SectionHeading>
                <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
                  Реальные кейсы поиска квартир и работы с владельцами
                </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Посмотрите, как сервис объектов решает конкретные задачи поисковиков квартир 
          и делает работу с владельцами эффективной и прозрачной.
        </p>
      </Container>
      <Container size="lg" className="mt-16">
        <ol
          role="list"
          className="grid grid-cols-1 gap-x-8 gap-y-10 [counter-reset:example] sm:grid-cols-2 lg:grid-cols-4"
        >
          {examples.map((example) => (
            <li key={example.title} className="[counter-increment:example]">
              <div
                className="relative flex h-44 items-center justify-center rounded-2xl px-6 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100"
              >
                <div className="text-6xl">
                  {example.icon}
                </div>
                <div className="absolute bottom-2 left-2 flex items-center rounded-lg bg-black/30 px-1.5 py-0.5 text-sm text-white [@supports(backdrop-filter:blur(0))]:bg-white/10 [@supports(backdrop-filter:blur(0))]:backdrop-blur-sm">
                  <PlayIcon className="h-4 w-4 fill-current stroke-current" />
                  <time
                    dateTime={`${example.runtime.minutes}m ${example.runtime.seconds}s`}
                    className="ml-2"
                  >
                    {`${example.runtime.minutes}:${example.runtime.seconds
                      .toString()
                      .padStart(2, '0')}`}
                  </time>
                </div>
              </div>
              <h3 className="mt-8 text-base font-medium tracking-tight text-slate-900 before:mb-2 before:block before:font-mono before:text-sm before:text-slate-500 before:content-[counter(example,decimal-leading-zero)]">
                {example.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{example.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
