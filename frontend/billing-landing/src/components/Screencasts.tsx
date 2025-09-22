import Image from 'next/image'

import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import duotoneImage from '@/images/screencasts/duotone.svg'
import gridsImage from '@/images/screencasts/grids.svg'
import setupImage from '@/images/screencasts/setup.svg'
import strokesImage from '@/images/screencasts/strokes.svg'

const examples = [
  {
    title: 'Предоплата за месяц',
    description:
      'RoomHunter создаёт счёт на 70 000 RUB, гость оплачивает по ссылке Stripe, статус брони = CONFIRMED.',
    icon: '💰',
    runtime: { minutes: 2, seconds: 15 },
  },
  {
    title: 'Возврат за отмену',
    description:
      'Finance делает issueRefund по платёжке, событие уходит в Booking и Owner видит скорректированную сумму.',
    icon: '↩',
    runtime: { minutes: 1, seconds: 30 },
  },
  {
    title: 'Депозит за ремонт',
    description:
      'HOLD на 10 000 RUB при заезде → RELEASE при выезде без инцидентов. Автоматический возврат.',
    icon: '🔒',
    runtime: { minutes: 2, seconds: 0 },
  },
  {
    title: 'Доплата за уборку',
    description:
      'Создаётся отдельный счёт на cleaningFee, оплата фиксируется отдельно от основной суммы.',
    icon: '🧹',
    runtime: { minutes: 1, seconds: 45 },
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
                  Реальные кейсы управления финансовыми операциями
                </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Посмотрите, как домен «Billing» решает конкретные задачи финансового управления 
          и делает денежные потоки прозрачными и автоматизированными.
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
