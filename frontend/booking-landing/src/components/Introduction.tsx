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
          Домен «Бронирования» — это ядро операций и прозрачности доходов, 
          единый источник правды о заказах гостей.
        </p>
        <p className="mt-4">
          Все процессы, связанные с заказами гостей: создание, подтверждение, отмена, перенос дат, статусы, гости, цены, депозиты. 
          Бронирование — это «золотая запись», от которой пляшут финансы, клининг и каналы.
        </p>
        <p className="mt-4">
          Без единого источника правды о заездах возникают овербукинги, потерянные платежи, 
          рассинхронизация с каналами и недовольные гости.
        </p>
        <p className="mt-4">
          Домен «Бронирования» превращает хаос в порядок — с помощью единого источника правды, автоматической синхронизации и прозрачности доходов.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Единый источник правды о заездах — одно бронирование = одна ответственность',
            'Связка с деньгами — биллинг и депозиты жёстко привязаны к брони',
            'Управляемость через статусы, причины отмен, логи изменений',
            'Прозрачность для владельцев — отчётность по загрузке и доходам',
            'Синхронизация без овербукингов — бронь мгновенно закрывает даты во всех каналах',
            'Автоматическая интеграция с финансами, клинингом и операциями',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-blue-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          С доменом «Бронирования» ваш бизнес работает, как хорошо отлаженный механизм. 
          Никаких овербукингов, потерянных платежей или недовольных гостей.
        </p>
        <p className="mt-10">
          <Link
            href="#demo-request"
            className="text-base font-medium text-blue-600 hover:text-blue-800"
          >
            Управлять бронированиями{' '}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>
      </Container>
    </section>
  )
}
