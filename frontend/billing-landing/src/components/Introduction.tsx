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
          Домен «Billing» — это «касса» системы, где сходятся гости, владельцы и сервис.
        </p>
        <p className="mt-4">
          Всё, что связано с деньгами: выставление счетов, учёт платежей, возвраты, удержания депозитов, 
          генерация ссылок на оплату. Billing превращает систему бронирования в реальный бизнес.
        </p>
        <p className="mt-4">
          Без контроля денежных потоков возникают просрочки, ошибки в расчётах, 
          потерянные платежи и недовольные владельцы.
        </p>
        <p className="mt-4">
          Домен «Billing» превращает хаос в порядок — с помощью прозрачности, автоматизации и интеграций с провайдерами.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Прозрачность — гость всегда видит, за что и сколько платит',
            'Контроль движения денег — все транзакции фиксируются и связаны с бронированиями',
            'Интеграции с провайдерами — Stripe, YooKassa и др.',
            'Управление рисками — депозиты, частичные возвраты, подтверждённые статусы',
            'Простая отчётность для владельцев — сверка начислений и выплат',
            'Автоматизация финансовых операций — от счёта до выплаты',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          С доменом «Billing» ваш бизнес работает, как хорошо отлаженный механизм. 
          Никаких просроченных платежей, ошибок в расчётах или недовольных владельцев.
        </p>
        <p className="mt-10">
          <Link
            href="#demo-request"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Настроить биллинг{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
