import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Legal & Compliance</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление правовыми документами, контрактами и соответствием требованиям
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">📋</span>
            </div>
            <Heading level={3}>Active Contracts</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">247</Text>
          <Text className="text-sm text-zinc-500">In effect</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⏰</span>
            </div>
            <Heading level={3}>Expiring Soon</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">23</Text>
          <Text className="text-sm text-zinc-500">Next 30 days</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">✅</span>
            </div>
            <Heading level={3}>Compliant</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">98.7%</Text>
          <Text className="text-sm text-zinc-500">Compliance rate</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Issues</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">3</Text>
          <Text className="text-sm text-zinc-500">Require attention</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Contract Types</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🏢</span>
                </div>
                <div>
                  <Text className="font-medium">Venue Agreements</Text>
                  <Text className="text-sm text-zinc-500">Rental and usage contracts</Text>
                </div>
              </div>
              <Badge color="blue">89 active</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">👥</span>
                </div>
                <div>
                  <Text className="font-medium">Service Contracts</Text>
                  <Text className="text-sm text-zinc-500">Catering, security, cleaning</Text>
                </div>
              </div>
              <Badge color="green">156 active</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🎵</span>
                </div>
                <div>
                  <Text className="font-medium">Entertainment</Text>
                  <Text className="text-sm text-zinc-500">Artists, performers, bands</Text>
                </div>
              </div>
              <Badge color="orange">67 active</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">⚖️</span>
                </div>
                <div>
                  <Text className="font-medium">Legal Services</Text>
                  <Text className="text-sm text-zinc-500">Lawyers, consultants</Text>
                </div>
              </div>
              <Badge color="purple">12 active</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent Legal Activities</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">New contract signed</Text>
                <Text className="text-sm text-zinc-500">Grand Arena - 2 year agreement</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Signed</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Contract review due</Text>
                <Text className="text-sm text-zinc-500">Catering Services Inc.</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Review</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Compliance audit passed</Text>
                <Text className="text-sm text-zinc-500">Safety regulations check</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Passed</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Legal notice received</Text>
                <Text className="text-sm text-zinc-500">Noise complaint from neighbor</Text>
              </div>
              <div className="text-right">
                <Badge color="red">Alert</Badge>
                <Text className="text-sm text-zinc-500">8 hours ago</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
