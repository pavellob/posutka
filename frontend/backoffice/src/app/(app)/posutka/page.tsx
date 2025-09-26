import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function PosutkaPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Posutka Platform</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Главная платформа для управления событиями и объектами
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">E</span>
            </div>
            <Heading level={3}>Events</Heading>
          </div>
          <Text className="text-zinc-600 dark:text-zinc-400">
            Управление событиями, билетами и бронированиями
          </Text>
          <div className="mt-4">
            <Badge color="blue">Active Events: 12</Badge>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">O</span>
            </div>
            <Heading level={3}>Objects</Heading>
          </div>
          <Text className="text-zinc-600 dark:text-zinc-400">
            Каталог объектов и управление инвентарем
          </Text>
          <div className="mt-4">
            <Badge color="green">Available: 245</Badge>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">B</span>
            </div>
            <Heading level={3}>Bookings</Heading>
          </div>
          <Text className="text-zinc-600 dark:text-zinc-400">
            Система бронирования и управления заказами
          </Text>
          <div className="mt-4">
            <Badge color="orange">Pending: 8</Badge>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <Heading level={2} className="mb-4">Recent Activity</Heading>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
            <div>
              <Text className="font-medium">New event &quot;Summer Festival&quot; created</Text>
              <Text className="text-sm text-zinc-500">2 hours ago</Text>
            </div>
            <Badge color="green">Success</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
            <div>
              <Text className="font-medium">Object inventory updated</Text>
              <Text className="text-sm text-zinc-500">4 hours ago</Text>
            </div>
            <Badge color="blue">Info</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Text className="font-medium">Booking confirmed for venue &quot;Grand Hall&quot;</Text>
              <Text className="text-sm text-zinc-500">6 hours ago</Text>
            </div>
            <Badge color="orange">Warning</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
