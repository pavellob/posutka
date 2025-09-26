import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function ProcurementPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Procurement & Supply Chain</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление закупками, поставщиками и цепочкой поставок
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">📋</span>
            </div>
            <Heading level={3}>Active Orders</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">127</Text>
          <Text className="text-sm text-zinc-500">In progress</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">✅</span>
            </div>
            <Heading level={3}>Delivered</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">1,089</Text>
          <Text className="text-sm text-zinc-500">This month</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⏰</span>
            </div>
            <Heading level={3}>Pending</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">89</Text>
          <Text className="text-sm text-zinc-500">Awaiting approval</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Delayed</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">23</Text>
          <Text className="text-sm text-zinc-500">Behind schedule</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Supplier Categories</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🎵</span>
                </div>
                <div>
                  <Text className="font-medium">Audio Equipment</Text>
                  <Text className="text-sm text-zinc-500">Sound systems, microphones</Text>
                </div>
              </div>
              <Badge color="blue">12 suppliers</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">💡</span>
                </div>
                <div>
                  <Text className="font-medium">Lighting Systems</Text>
                  <Text className="text-sm text-zinc-500">Stage lights, controllers</Text>
                </div>
              </div>
              <Badge color="green">8 suppliers</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🪑</span>
                </div>
                <div>
                  <Text className="font-medium">Furniture & Staging</Text>
                  <Text className="text-sm text-zinc-500">Tables, chairs, platforms</Text>
                </div>
              </div>
              <Badge color="orange">15 suppliers</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🍽️</span>
                </div>
                <div>
                  <Text className="font-medium">Catering Services</Text>
                  <Text className="text-sm text-zinc-500">Food, beverages, service</Text>
                </div>
              </div>
              <Badge color="purple">24 suppliers</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent Procurement Activities</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">New order placed</Text>
                <Text className="text-sm text-zinc-500">Wireless microphone system - AudioPro</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Ordered</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Delivery confirmed</Text>
                <Text className="text-sm text-zinc-500">LED stage lights - LightMaster Inc.</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Delivered</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Supplier contract renewed</Text>
                <Text className="text-sm text-zinc-500">Furniture Solutions Ltd - 2 year</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Renewed</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Payment processed</Text>
                <Text className="text-sm text-zinc-500">Catering invoice - Delicious Events</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Paid</Badge>
                <Text className="text-sm text-zinc-500">8 hours ago</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
