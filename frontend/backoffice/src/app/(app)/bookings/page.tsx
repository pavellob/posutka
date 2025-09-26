import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Bookings Management</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление бронированиями, заказами и резервациями
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">📅</span>
            </div>
            <Heading level={3}>Total Bookings</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">1,247</Text>
          <Text className="text-sm text-zinc-500">This month</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">✅</span>
            </div>
            <Heading level={3}>Confirmed</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">1,089</Text>
          <Text className="text-sm text-zinc-500">87.3%</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⏳</span>
            </div>
            <Heading level={3}>Pending</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">158</Text>
          <Text className="text-sm text-zinc-500">12.7%</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">❌</span>
            </div>
            <Heading level={3}>Cancelled</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">47</Text>
          <Text className="text-sm text-zinc-500">3.8%</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent Bookings</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Summer Music Festival</Text>
                <Text className="text-sm text-zinc-500">Venue: Grand Arena • Date: July 15</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Confirmed</Badge>
                <Text className="text-sm text-zinc-500 mt-1">$2,500</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Corporate Conference</Text>
                <Text className="text-sm text-zinc-500">Venue: Business Center • Date: July 20</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Pending</Badge>
                <Text className="text-sm text-zinc-500 mt-1">$1,800</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Wedding Reception</Text>
                <Text className="text-sm text-zinc-500">Venue: Garden Palace • Date: July 25</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Confirmed</Badge>
                <Text className="text-sm text-zinc-500 mt-1">$3,200</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <Text className="font-medium">Art Exhibition Opening</Text>
                <Text className="text-sm text-zinc-500">Venue: Modern Gallery • Date: July 28</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Processing</Badge>
                <Text className="text-sm text-zinc-500 mt-1">$850</Text>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Popular Venues</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">🏟️</span>
                </div>
                <div>
                  <Text className="font-medium">Grand Arena</Text>
                  <Text className="text-sm text-zinc-500">Capacity: 5,000</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">127 bookings</Text>
                <Text className="text-sm text-zinc-500">$45,230</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">🏢</span>
                </div>
                <div>
                  <Text className="font-medium">Business Center</Text>
                  <Text className="text-sm text-zinc-500">Capacity: 300</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">89 bookings</Text>
                <Text className="text-sm text-zinc-500">$28,450</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-lg">🏛️</span>
                </div>
                <div>
                  <Text className="font-medium">Garden Palace</Text>
                  <Text className="text-sm text-zinc-500">Capacity: 800</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">156 bookings</Text>
                <Text className="text-sm text-zinc-500">$52,800</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">🎨</span>
                </div>
                <div>
                  <Text className="font-medium">Modern Gallery</Text>
                  <Text className="text-sm text-zinc-500">Capacity: 150</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">67 bookings</Text>
                <Text className="text-sm text-zinc-500">$18,900</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
