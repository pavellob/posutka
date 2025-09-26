import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function ObjectServicePage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Object Service</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление объектами, их характеристиками и сервисами
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🏢</span>
            </div>
            <Heading level={3}>Total Objects</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">1,847</Text>
          <Text className="text-sm text-zinc-500">Registered objects</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">✅</span>
            </div>
            <Heading level={3}>Available</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">1,234</Text>
          <Text className="text-sm text-zinc-500">Ready to book</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🔧</span>
            </div>
            <Heading level={3}>In Service</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">567</Text>
          <Text className="text-sm text-zinc-500">Currently booked</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Maintenance</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">46</Text>
          <Text className="text-sm text-zinc-500">Out of service</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Object Categories</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">🏟️</span>
                </div>
                <div>
                  <Text className="font-medium">Venues</Text>
                  <Text className="text-sm text-zinc-500">Conference halls, arenas</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">342 objects</Text>
                <Badge color="blue">High demand</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">🏨</span>
                </div>
                <div>
                  <Text className="font-medium">Accommodations</Text>
                  <Text className="text-sm text-zinc-500">Hotels, rooms, suites</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">567 objects</Text>
                <Badge color="green">Available</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-lg">🚗</span>
                </div>
                <div>
                  <Text className="font-medium">Transportation</Text>
                  <Text className="text-sm text-zinc-500">Buses, cars, shuttles</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">189 objects</Text>
                <Badge color="orange">Limited</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">🎨</span>
                </div>
                <div>
                  <Text className="font-medium">Entertainment</Text>
                  <Text className="text-sm text-zinc-500">Stages, equipment, props</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">234 objects</Text>
                <Badge color="purple">Premium</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Service Activities</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">New venue registered</Text>
                <Text className="text-sm text-zinc-500">Modern Conference Center</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Added</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Object status updated</Text>
                <Text className="text-sm text-zinc-500">Grand Hall - Maintenance scheduled</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Updated</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Service request completed</Text>
                <Text className="text-sm text-zinc-500">Audio setup for Business Center</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Completed</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Object availability changed</Text>
                <Text className="text-sm text-zinc-500">Garden Palace - Now available</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Available</Badge>
                <Text className="text-sm text-zinc-500">8 hours ago</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
