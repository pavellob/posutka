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
          Сервис объектов — это помощник для поисковиков квартир, риелторов и менеджеров субаренды: 
          поиск объектов, заключение договоров и управление сетями недвижимости.
        </p>
        <p className="mt-4">
          Помогаем людям, которые ищут квартиры для аренды, заключают договоры с владельцами и управляют сетями субаренды. 
          Автоматизируем поиск объектов, упрощаем заключение договоров и обеспечиваем прозрачность в работе с владельцами недвижимости.
        </p>
        <p className="mt-4">
          Без автоматизации поиск квартир занимает недели, договоры теряются в бумагах, 
          а работа с владельцами превращается в хаос звонков и переписок.
        </p>
        <p className="mt-4">
          Сервис объектов превращает хаос в порядок — с помощью умного поиска, автоматизации договоров и управления отношениями с владельцами.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Умный поиск квартир по критериям и локации',
            'Автоматизация заключения договоров с владельцами',
            'Управление сетями субаренды и отношениями с партнёрами',
            'Календарь доступности объектов и планирование заселений',
            'Отслеживание статуса договоров и автоматические напоминания',
            'Аналитика по эффективности поиска и работе с владельцами',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          С сервисом объектов ваш бизнес работает, как хорошо отлаженный механизм. 
          Никаких потерянных договоров, пропущенных объектов или проблем с владельцами.
        </p>
        <p className="mt-10">
          <Link
            href="#demo-request"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Начать поиск квартир{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
