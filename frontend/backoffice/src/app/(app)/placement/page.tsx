import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function PlacementPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Placement Management</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление размещением объектов, планированием и распределением ресурсов
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">📍</span>
            </div>
            <Heading level={3}>Active Placements</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">847</Text>
          <Text className="text-sm text-zinc-500">Currently placed</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">✅</span>
            </div>
            <Heading level={3}>Optimized</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">734</Text>
          <Text className="text-sm text-zinc-500">87% efficiency</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🔄</span>
            </div>
            <Heading level={3}>Pending</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">89</Text>
          <Text className="text-sm text-zinc-500">Awaiting placement</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Conflicts</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">24</Text>
          <Text className="text-sm text-zinc-500">Need resolution</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Placement Zones</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">🏟️</span>
                </div>
                <div>
                  <Text className="font-medium">Main Arena</Text>
                  <Text className="text-sm text-zinc-500">Central event space</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">89% occupied</Text>
                <Badge color="blue">High traffic</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">🏢</span>
                </div>
                <div>
                  <Text className="font-medium">Business District</Text>
                  <Text className="text-sm text-zinc-500">Corporate events area</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">67% occupied</Text>
                <Badge color="green">Available</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-lg">🎪</span>
                </div>
                <div>
                  <Text className="font-medium">Entertainment Zone</Text>
                  <Text className="text-sm text-zinc-500">Shows and performances</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">92% occupied</Text>
                <Badge color="orange">Peak hours</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">🏛️</span>
                </div>
                <div>
                  <Text className="font-medium">Cultural Center</Text>
                  <Text className="text-sm text-zinc-500">Art and exhibitions</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">45% occupied</Text>
                <Badge color="purple">Low demand</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent Placement Activities</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">New placement optimized</Text>
                <Text className="text-sm text-zinc-500">Summer Festival - Main Arena</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Optimized</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Placement conflict resolved</Text>
                <Text className="text-sm text-zinc-500">Corporate Conference vs Wedding</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Resolved</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Resource reallocation</Text>
                <Text className="text-sm text-zinc-500">Audio equipment moved to Zone B</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Moved</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">New zone created</Text>
                <Text className="text-sm text-zinc-500">VIP Lounge - Entertainment Zone</Text>
              </div>
              <div className="text-right">
                <Badge color="purple">Created</Badge>
                <Text className="text-sm text-zinc-500">8 hours ago</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
