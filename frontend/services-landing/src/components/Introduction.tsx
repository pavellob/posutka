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
          Домен «Операции и обслуживание» — это комплексная система автоматизации 
          всех операционных процессов в посуточной аренде.
        </p>
        <p className="mt-4">
          Каждый гость ожидает идеальной чистоты, готового к заселению жилья и быстрой реакции на любые проблемы. 
          Для управляющей компании это означает десятки мелких процессов: уборки после выезда, профилактические осмотры, 
          ремонтные заявки, инциденты.
        </p>
        <p className="mt-4">
          Без автоматизации эти процессы превращаются в хаос, который съедает время, деньги и репутацию.
        </p>
        <p className="mt-4">
          Домен «Операции» превращает хаос в порядок — с помощью задач, SLA и прозрачного контроля качества.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Автоматическое планирование уборок по датам выезда гостей',
            'Контроль заселений и выселений с уведомлениями',
            'Контроль качества через чеклисты и фотоотчёты',
            'Управление инцидентами с SLA и эскалацией',
            'Интеграция с доменами бронирований и закупок',
            'Мобильный доступ для сотрудников и аналитика для менеджеров',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          С доменом «Операции» ваш бизнес работает, как хорошо отлаженный механизм. 
          Никаких пропущенных уборок, забытых инцидентов или недовольных гостей.
        </p>
        <p className="mt-10">
          <Link
            href="#demo-request"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Начните использовать систему{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
