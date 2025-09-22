import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Pattern } from '@/components/Pattern'

export function FreeChapters() {
  return (
    <section
      id="demo-request"
      aria-label="Demo request"
      className="scroll-mt-14 bg-blue-600 sm:scroll-mt-32"
    >
      <div className="overflow-hidden lg:relative">
        <Container
          size="md"
          className="relative grid grid-cols-1 items-end gap-y-12 py-20 lg:static lg:grid-cols-2 lg:py-28 xl:py-32"
        >
          <Pattern className="absolute -top-32 left-0 w-full sm:-top-5 sm:left-3/4 sm:ml-8 sm:w-auto md:left-2/3 lg:right-2 lg:left-auto lg:ml-0 xl:right-auto xl:left-2/3" />
          <div>
            <h2 className="font-display text-5xl font-extrabold tracking-tight text-white sm:w-3/4 sm:text-6xl md:w-2/3 lg:w-auto">
              Настройте биллинг уже сегодня
            </h2>
            <p className="mt-4 text-lg tracking-tight text-blue-200">
              Создайте аккаунт и получите доступ к домену Billing. 
              Управляйте счетами, платежами, депозитами и интеграциями с провайдерами.
            </p>
          </div>
          <div className="lg:pl-16">
            <h3 className="text-base font-medium tracking-tight text-white">
              Настройте биллинг за 2 минуты{' '}
              <span aria-hidden="true">&rarr;</span>
            </h3>
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <Button
                href="/register"
                color="white"
                className="w-full sm:w-auto"
              >
                Настроить биллинг
              </Button>
              <Button
                href="/login"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-600"
              >
                Войти в систему
              </Button>
            </div>
            <p className="mt-4 text-sm text-blue-200">
              Бесплатно • Без кредитной карты • Начните сразу
            </p>
          </div>
        </Container>
      </div>
    </section>
  )
}
