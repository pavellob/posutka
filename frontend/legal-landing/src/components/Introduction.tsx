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
          Домен «Legal» — это «правовой щит» сервиса, который снижает риски 
          и делает отношения с гостями и владельцами прозрачными.
        </p>
        <p className="mt-4">
          Всё, что связано с юридическими документами, депозитами и правовой прозрачностью: автоматическая генерация договоров, 
          фиксация условий аренды, удержание и возврат залогов.
        </p>
        <p className="mt-4">
          Без юридической защиты возникают споры, конфликты, потерянное имущество 
          и недоверие между гостями и владельцами.
        </p>
        <p className="mt-4">
          Домен «Legal» превращает хаос в порядок — с помощью автоматических договоров, прозрачных депозитов и юридической защиты.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Юридическая защита — каждый заезд сопровождается договором',
            'Автоматизация — договоры генерируются из шаблонов',
            'Прозрачность депозитов — гости знают, когда и сколько удержано',
            'Минимизация конфликтов — чёткий регламент при ущербе',
            'Аудит и доказательная база — всё фиксируется и хранится',
            'Интеграция с доменами бронирований, биллинга и операций',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          С доменом «Legal» ваш бизнес работает, как хорошо отлаженный механизм. 
          Никаких споров, конфликтов или потери имущества.
        </p>
        <p className="mt-10">
          <Link
            href="#demo-request"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Настроить Legal{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
