import { Container } from '@/components/Container'
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from '@/components/Expandable'
import { SectionHeading } from '@/components/SectionHeading'

const tableOfContents = {
  'Getting started': {
    'Getting started': 1,
    'Intro to Figma': 15,
    'Setting up your first artboard': 20,
  },
  Fundamentals: {
    'Strokes and fills': 21,
    'End points': 22,
    'Bezier curves': 26,
    'Designing on a grid': 31,
    'Vector shapes': 45,
  },
  'Boolean operations': {
    'Combining shapes': 50,
    'Subtracting shapes': 57,
    'Intersecting shapes': 66,
    Flattening: 78,
  },
  'Optimizing for production': {
    'Preparing for SVG': 82,
    'Configuring your export settings': 88,
    'Minifying and removing metadata': 95,
  },
}

export function TableOfContents() {
  return (
    <section
      id="operations-domain"
      aria-labelledby="operations-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="operations-title">
          Операции и обслуживание
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Хаускипинг, Инциденты — превращаем хаос в порядок
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Каждый гость ожидает идеальной чистоты, готового к заселению жилья и быстрой реакции на любые проблемы. 
          Для управляющей компании это означает десятки мелких процессов: уборки после выезда, профилактические осмотры, 
          ремонтные заявки, инциденты. Без автоматизации они превращаются в хаос.
        </p>
        <p className="mt-4 text-lg font-medium tracking-tight text-slate-900">
          Домен «Операции» превращает хаос в порядок — с помощью задач, SLA и прозрачного контроля качества.
        </p>
        <div className="mt-16 space-y-10 sm:space-y-16">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Что входит в домен
            </h3>
            <ol
              role="list"
              className="mt-8 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
            >
              {[
                { title: 'Заселения (CheckIn)', description: 'контроль заезда гостей с уведомлениями и инструкциями' },
                { title: 'Выселения (CheckOut)', description: 'автоматическое планирование уборок после выезда' },
                { title: 'Уборки (CleaningTask)', description: 'планируются автоматически по датам выезда гостей' },
                { title: 'Осмотры (Inspection)', description: 'регулярные проверки состояния объектов' },
                { title: 'Инциденты (Incident)', description: 'фиксация проблем от лампочки до протечки' },
                { title: 'Заявки и приказы (WorkOrder)', description: 'формализованное задание с чеклистами' },
                { title: 'Назначения (Assignment)', description: 'кто и когда выполняет задачу' },
                { title: 'Графики (Schedule)', description: 'распределение нагрузки между сотрудниками' },
              ].map((item, index) => (
                <li
                  key={item.title}
                  className="flex justify-between py-3"
                  aria-label={`${item.title}: ${item.description}`}
                >
                  <div className="flex-1">
                    <span className="font-medium text-slate-900">
                      {item.title}
                    </span>
                    <span className="ml-2 text-slate-600">
                      — {item.description}
                    </span>
                  </div>
                  <span
                    className="font-mono text-slate-400 ml-4"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  )
}
