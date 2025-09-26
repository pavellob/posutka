import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function ListingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Listings Management</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление каталогом объектов, услугами и их публикацией
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">📋</span>
            </div>
            <Heading level={3}>Total Listings</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">1,847</Text>
          <Text className="text-sm text-zinc-500">Published items</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">✅</span>
            </div>
            <Heading level={3}>Active</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">1,567</Text>
          <Text className="text-sm text-zinc-500">Available now</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⏳</span>
            </div>
            <Heading level={3}>Pending</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">156</Text>
          <Text className="text-sm text-zinc-500">Awaiting approval</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Issues</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">24</Text>
          <Text className="text-sm text-zinc-500">Need attention</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Listing Categories</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">🏟️</span>
                </div>
                <div>
                  <Text className="font-medium">Venues</Text>
                  <Text className="text-sm text-zinc-500">Conference halls, arenas, outdoor spaces</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">567 listings</Text>
                <Badge color="blue">High demand</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-lg">🎵</span>
                </div>
                <div>
                  <Text className="font-medium">Entertainment</Text>
                  <Text className="text-sm text-zinc-500">Bands, DJs, performers, artists</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">342 listings</Text>
                <Badge color="green">Active</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-lg">🍽️</span>
                </div>
                <div>
                  <Text className="font-medium">Catering</Text>
                  <Text className="text-sm text-zinc-500">Food services, beverages, catering</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">189 listings</Text>
                <Badge color="orange">Popular</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">🛠️</span>
                </div>
                <div>
                  <Text className="font-medium">Services</Text>
                  <Text className="text-sm text-zinc-500">Technical, support, maintenance</Text>
                </div>
              </div>
              <div className="text-right">
                <Text className="font-medium">234 listings</Text>
                <Badge color="purple">Premium</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent Listing Activities</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">New venue listed</Text>
                <Text className="text-sm text-zinc-500">Modern Conference Center - Premium tier</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Published</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Listing updated</Text>
                <Text className="text-sm text-zinc-500">Grand Arena - New pricing structure</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Updated</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Listing suspended</Text>
                <Text className="text-sm text-zinc-500">Old Theater - Pending maintenance</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Suspended</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Featured listing</Text>
                <Text className="text-sm text-zinc-500">Garden Palace - Promoted to featured</Text>
              </div>
              <div className="text-right">
                <Badge color="purple">Featured</Badge>
                <Text className="text-sm text-zinc-500">8 hours ago</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
