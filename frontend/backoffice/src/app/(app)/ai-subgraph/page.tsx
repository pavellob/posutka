import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function AISubgraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>AI Subgraph</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Искусственный интеллект для оптимизации процессов и аналитики
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🤖</span>
            </div>
            <Heading level={3}>AI Models</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">12</Text>
          <Text className="text-sm text-zinc-500">Active models</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">📊</span>
            </div>
            <Heading level={3}>Predictions</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">2,847</Text>
          <Text className="text-sm text-zinc-500">Today&apos;s predictions</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚡</span>
            </div>
            <Heading level={3}>Processing</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">89.7%</Text>
          <Text className="text-sm text-zinc-500">Accuracy rate</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🧠</span>
            </div>
            <Heading level={3}>Learning</Heading>
          </div>
          <Text className="text-2xl font-bold text-purple-600">247</Text>
          <Text className="text-sm text-zinc-500">Training sessions</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">AI Capabilities</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🎯</span>
                </div>
                <div>
                  <Text className="font-medium">Demand Prediction</Text>
                  <Text className="text-sm text-zinc-500">Event attendance forecasting</Text>
                </div>
              </div>
              <Badge color="blue">Active</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">💰</span>
                </div>
                <div>
                  <Text className="font-medium">Price Optimization</Text>
                  <Text className="text-sm text-zinc-500">Dynamic pricing algorithms</Text>
                </div>
              </div>
              <Badge color="green">Optimized</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">🔍</span>
                </div>
                <div>
                  <Text className="font-medium">Anomaly Detection</Text>
                  <Text className="text-sm text-zinc-500">System monitoring & alerts</Text>
                </div>
              </div>
              <Badge color="orange">Monitoring</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">💬</span>
                </div>
                <div>
                  <Text className="font-medium">Chat Assistant</Text>
                  <Text className="text-sm text-zinc-500">Customer support automation</Text>
                </div>
              </div>
              <Badge color="purple">Learning</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent AI Activities</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Model training completed</Text>
                <Text className="text-sm text-zinc-500">Demand prediction v2.1</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Success</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Anomaly detected</Text>
                <Text className="text-sm text-zinc-500">Unusual booking pattern - Grand Arena</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Alert</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Price optimization applied</Text>
                <Text className="text-sm text-zinc-500">Summer Festival tickets - +15% efficiency</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Applied</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Chat assistant updated</Text>
                <Text className="text-sm text-zinc-500">New knowledge base integration</Text>
              </div>
              <div className="text-right">
                <Badge color="purple">Updated</Badge>
                <Text className="text-sm text-zinc-500">8 hours ago</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
