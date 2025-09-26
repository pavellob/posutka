import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Services Management</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление сервисами, поддержкой клиентов и операционными процессами
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🔧</span>
            </div>
            <Heading level={3}>Active Services</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">347</Text>
          <Text className="text-sm text-zinc-500">Currently running</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">✅</span>
            </div>
            <Heading level={3}>Completed</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">1,247</Text>
          <Text className="text-sm text-zinc-500">This month</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⏳</span>
            </div>
            <Heading level={3}>Pending</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">89</Text>
          <Text className="text-sm text-zinc-500">Awaiting processing</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Issues</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">12</Text>
          <Text className="text-sm text-zinc-500">Need attention</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Service Categories</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">🎵</span>
                </div>
                <div>
                  <Text className="font-medium">Technical Support</Text>
                  <Text className="text-sm text-zinc-500">Audio, lighting, equipment</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">127 services</Text>
                <Badge color="blue">High demand</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">🏢</span>
                </div>
                <div>
                  <Text className="font-medium">Event Management</Text>
                  <Text className="text-sm text-zinc-500">Planning, coordination, execution</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">89 services</Text>
                <Badge color="green">Active</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-lg">👥</span>
                </div>
                <div>
                  <Text className="font-medium">Customer Support</Text>
                  <Text className="text-sm text-zinc-500">Help desk, inquiries, issues</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">234 services</Text>
                <Badge color="orange">24/7</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">🛠️</span>
                </div>
                <div>
                  <Text className="font-medium">Maintenance</Text>
                  <Text className="text-sm text-zinc-500">Equipment, facilities, systems</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">156 services</Text>
                <Badge color="purple">Scheduled</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent Service Activities</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Technical support completed</Text>
                <Text className="text-sm text-zinc-500">Audio system setup for Summer Festival</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Completed</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">New service request</Text>
                <Text className="text-sm text-zinc-500">Event planning consultation needed</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Pending</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Customer issue resolved</Text>
                <Text className="text-sm text-zinc-500">Booking system login problem</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Resolved</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Maintenance scheduled</Text>
                <Text className="text-sm text-zinc-500">HVAC system inspection - Grand Arena</Text>
              </div>
              <div className="text-right">
                <Badge color="purple">Scheduled</Badge>
                <Text className="text-sm text-zinc-500">8 hours ago</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
