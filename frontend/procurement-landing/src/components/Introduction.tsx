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
          Домен «Procurement» — это система управления закупками, 
          которая автоматизирует работу с поставщиками и складом.
        </p>
        <p className="mt-4">
          Поставщики, заказы, склад/остатки, пополнения, приёмка — всё это требует чёткого контроля и автоматизации. 
          От расходников для уборки до запасных частей для ремонта.
        </p>
        <p className="mt-4">
          Без контроля закупок возникают ситуации с недостатком расходников, переплаты поставщикам, 
          потерянные заказы и неэффективное использование ресурсов.
        </p>
        <p className="mt-4">
          Домен «Procurement» превращает хаос в порядок — с помощью автоматизации закупок, контроля остатков и интеграции с поставщиками.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Автоматические заявки на расходники от операционной команды',
            'Контроль остатков и автоматические пополнения',
            'Управление поставщиками и их рейтингами',
            'Отслеживание заказов и приёмка поставок',
            'Интеграция с финансами для оплаты поставщиков',
            'Аналитика по закупкам и оптимизация расходов',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          С доменом «Procurement» ваш бизнес работает, как хорошо отлаженный механизм. 
          Никаких ситуаций с недостатком расходников, переплат или потерянных заказов.
        </p>
        <p className="mt-10">
          <Link
            href="#demo-request"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Настроить закупки{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
