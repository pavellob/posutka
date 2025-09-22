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
          Система «Кто есть кто» — это IAM-решение для управления пользователями, 
          ролями и доступами в сфере недвижимости.
        </p>
        <p className="mt-4">
          Чтобы бизнес работал как часы, нужно чётко понимать: кто имеет доступ к каким данным, кто за что отвечает 
          и какие права делегированы партнёрам или подрядчикам. IAM-домен отвечает на ключевой вопрос: кто есть кто в твоей экосистеме.
        </p>
        <p className="mt-4">
          Без чёткого разграничения прав доступы становятся хаосом — кто-то видит слишком много, 
          кто-то слишком мало, а безопасность данных под угрозой.
        </p>
        <p className="mt-4">
          IAM-система превращает хаос в порядок — с помощью ролей, прав и прозрачного контроля доступа.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Управление пользователями — сотрудники, партнёры, гости, администраторы',
            'Роли и права — чёткое разграничение доступа по функциям',
            'Партнёры — интеграторы, агенты, подрядчики с собственными ключами',
            'API-ключи и сессии — безопасный доступ к сервисам и автоматизация',
            'Аудит и прозрачность — каждый доступ фиксируется и контролируется',
            'Гибкость настройки — подстраивай роли под любой бизнес-процесс',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          С IAM-системой «Кто есть кто» ваш бизнес работает, как хорошо отлаженный механизм. 
          Никаких лишних прав, неконтролируемых доступов или проблем с безопасностью.
        </p>
        <p className="mt-10">
          <Link
            href="#demo-request"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Настроить систему доступов{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
