import Image from 'next/image'

import { Container } from '@/components/Container'
import backgroundImage from '@/images/background-faqs.jpg'

const faqs = [
  [
    {
      question: 'Сколько стоит использование платформы?',
      answer:
        'Базовый функционал бесплатный. Комиссия только за подключённые сервисы (уборка, заселение). Pro-тариф — 990₽/мес за расширенную аналитику.',
    },
    {
      question: 'Могу ли я управлять несколькими квартирами?',
      answer: 'Да, в едином дашборде вы можете управлять любым количеством объектов. Шахматка бронирований показывает загрузку всех квартир.',
    },
    {
      question: 'Как подключить услуги уборки?',
      answer:
        'Интегрируемся с популярными клининговыми сервисами. Система автоматически заказывает уборку после выезда гостей.',
    },
  ],
  [
    {
      question: 'Как работает юридическая часть?',
      answer:
        'Все договоры генерируются автоматически и соответствуют российскому законодательству. Залоги и споры решаются через встроенную систему.',
    },
    {
      question: 'Что делать при споре с гостем?',
      answer:
        'Система фиксирует состояние квартиры до и после заселения. Споры решаются через арбитраж с участием экспертов и страховых компаний.',
    },
    {
      question: 'Есть ли интеграция с Airbnb и Booking?',
      answer:
        'Да, синхронизируемся с основными площадками. Все бронирования попадают в единый календарь, исключая двойные заселения.',
    },
  ],
  [
    {
      question: 'Как работает автоматизация заселений?',
      answer:
        'Гости получают код от умного замка или QR-код. Вы видите все события в приложении и можете дистанционно управлять доступом.',
    },
    {
      question: 'Какая аналитика доступна?',
      answer: 'Доходность по объектам, загрузка, расходы на уборку и ремонт. В Pro-тарифе — детальная аналитика с прогнозами.',
    },
    {
      question: 'Как начать пользоваться платформой?',
      answer:
        'Зарегистрируйтесь, добавьте информацию о квартирах, загрузите фото и начните принимать бронирования. Первый месяц бесплатно.',
    },
  ],
]

export function Faqs() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="relative overflow-hidden bg-slate-50 py-20 sm:py-32"
    >
      <Image
        className="absolute top-0 left-1/2 max-w-none translate-x-[-30%] -translate-y-1/4"
        src={backgroundImage}
        alt=""
        width={1558}
        height={946}
        unoptimized
      />
      <Container className="relative">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2
            id="faq-title"
            className="font-display text-3xl tracking-tight text-slate-900 sm:text-4xl"
          >
            Часто задаваемые вопросы
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700">
            Не нашли ответ на свой вопрос? Напишите в поддержку — мы ответим в течение часа.
          </p>
        </div>
        <ul
          role="list"
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3"
        >
          {faqs.map((column, columnIndex) => (
            <li key={columnIndex}>
              <ul role="list" className="flex flex-col gap-y-8">
                {column.map((faq, faqIndex) => (
                  <li key={faqIndex}>
                    <h3 className="font-display text-lg/7 text-slate-900">
                      {faq.question}
                    </h3>
                    <p className="mt-4 text-sm text-slate-700">{faq.answer}</p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
