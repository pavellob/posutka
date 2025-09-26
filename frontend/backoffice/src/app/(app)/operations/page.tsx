import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Operations Management</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление операционными процессами, мониторингом и производительностью
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚡</span>
            </div>
            <Heading level={3}>System Health</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">99.8%</Text>
          <Text className="text-sm text-zinc-500">Uptime</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">📊</span>
            </div>
            <Heading level={3}>Active Processes</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">247</Text>
          <Text className="text-sm text-zinc-500">Running</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⏱️</span>
            </div>
            <Heading level={3}>Response Time</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">145ms</Text>
          <Text className="text-sm text-zinc-500">Average</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Alerts</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">3</Text>
          <Text className="text-sm text-zinc-500">Critical</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">System Components</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🖥️</span>
                </div>
                <div>
                  <Text className="font-medium">API Gateway</Text>
                  <Text className="text-sm text-zinc-500">Request routing and load balancing</Text>
                </div>
              </div>
              <Badge color="green">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🗄️</span>
                </div>
                <div>
                  <Text className="font-medium">Database Cluster</Text>
                  <Text className="text-sm text-zinc-500">Primary and replica instances</Text>
                </div>
              </div>
              <Badge color="blue">Stable</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🔄</span>
                </div>
                <div>
                  <Text className="font-medium">Message Queue</Text>
                  <Text className="text-sm text-zinc-500">Event processing and notifications</Text>
                </div>
              </div>
              <Badge color="orange">Busy</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">⚠️</span>
                </div>
                <div>
                  <Text className="font-medium">Cache Layer</Text>
                  <Text className="text-sm text-zinc-500">Redis cluster performance</Text>
                </div>
              </div>
              <Badge color="red">Warning</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent Operations</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">System backup completed</Text>
                <Text className="text-sm text-zinc-500">Database backup - 2.3TB processed</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Success</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Performance optimization</Text>
                <Text className="text-sm text-zinc-500">Query optimization - 23% improvement</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Optimized</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Security update applied</Text>
                <Text className="text-sm text-zinc-500">API Gateway - Security patch v2.1.3</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Updated</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Alert triggered</Text>
                <Text className="text-sm text-zinc-500">High memory usage - Cache layer</Text>
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
