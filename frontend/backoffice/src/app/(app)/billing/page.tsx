import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

import Link from 'next/link'

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Деньги</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление биллингом, платежами и финансовой отчетностью
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/billing/pricing" className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-lg">₽</span>
            </div>
            <Heading level={3}>Ценообразование</Heading>
          </div>
          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
            Настройка правил расчёта стоимости уборок и ремонтов
          </Text>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">$</span>
            </div>
            <Heading level={3}>Доходы</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">$45,230</Text>
          <Text className="text-sm text-zinc-500">Этот месяц</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">I</span>
            </div>
            <Heading level={3}>Счета</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">127</Text>
          <Text className="text-sm text-zinc-500">Ожидают</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">P</span>
            </div>
            <Heading level={3}>Платежи</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">89</Text>
          <Text className="text-sm text-zinc-500">Эта неделя</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">!</span>
            </div>
            <Heading level={3}>Просрочено</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">12</Text>
          <Text className="text-sm text-zinc-500">Аккаунтов</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Последние Транзакции</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Платеж от EventCorp</Text>
                <Text className="text-sm text-zinc-500">Счет #INV-2024-001</Text>
              </div>
              <div className="text-right">
                <Text className="font-medium text-green-600">+$2,500</Text>
                <Text className="text-sm text-zinc-500">2 часа назад</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Возврат BookNow</Text>
                <Text className="text-sm text-zinc-500">Бронирование #BK-2024-045</Text>
              </div>
              <div className="text-right">
                <Text className="font-medium text-red-600">-$150</Text>
                <Text className="text-sm text-zinc-500">4 часа назад</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Месячная подписка</Text>
                <Text className="text-sm text-zinc-500">VenueManager Pro</Text>
              </div>
              <div className="text-right">
                <Text className="font-medium text-green-600">+$99</Text>
                <Text className="text-sm text-zinc-500">1 день назад</Text>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Способы Оплаты</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                  <span className="text-white text-sm">💳</span>
                </div>
                <div>
                  <Text className="font-medium">Кредитная Карта</Text>
                  <Text className="text-sm text-zinc-500">**** 4242</Text>
                </div>
              </div>
              <Badge color="green">Активно</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                  <span className="text-white text-sm">🏦</span>
                </div>
                <div>
                  <Text className="font-medium">Банковский Перевод</Text>
                  <Text className="text-sm text-zinc-500">Основной счет</Text>
                </div>
              </div>
              <Badge color="green">Активно</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                  <span className="text-white text-sm">₿</span>
                </div>
                <div>
                  <Text className="font-medium">Криптовалюта</Text>
                  <Text className="text-sm text-zinc-500">Биткоин кошелек</Text>
                </div>
              </div>
              <Badge color="blue">Ожидает</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
