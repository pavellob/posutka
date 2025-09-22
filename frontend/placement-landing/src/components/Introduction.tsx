import Link from 'next/link'

import { CheckIcon } from '@/components/CheckIcon'
import { Container } from '@/components/Container'

export function Introduction() {
  return (
    <section
      id="introduction"
      aria-label="Introduction"
      className="pt-20 pb-16 sm:pb-20 md:pt-36 lg:py-32"
    >
      <Container className="text-lg tracking-tight text-slate-700">
        <p className="font-display text-4xl font-bold tracking-tight text-slate-900">
          Домен «Placement» — это единый центр управления размещением, 
          который превращает хаос в централизованное управление.
        </p>
        <p className="mt-4">
          Airbnb, Booking.com, собственный сайт — десятки каналов, разные правила, разные комиссии. 
          Один клик — и ваши цены, фото и правила доступны на всех площадках.
        </p>
        <p className="mt-4">
          Без централизованного управления возникают овербукинги, рассинхронизация цен, 
          потерянные брони и недовольные гости.
        </p>
        <p className="mt-4">
          Домен «Placement» превращает хаос в порядок — с помощью централизованного управления и автоматической синхронизации.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Экономия времени — не нужно вручную обновлять каждый канал',
            'Без овербукингов — единый календарь для всех площадок',
            'Рост продаж — больше каналов = больше броней без лишней рутины',
            'Гибкая стратегия — управляй ценами и тарифами централизованно',
            'Прозрачность — все данные о бронях и тарифах в одном месте',
            'Автоматическая синхронизация контента и цен во всех каналах',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          С доменом «Placement» ваш бизнес работает, как хорошо отлаженный механизм. 
          Никаких овербукингов, рассинхронизации или потерянных броней.
        </p>
        <p className="mt-10">
          <Link
            href="#demo-request"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Настроить каналы{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
