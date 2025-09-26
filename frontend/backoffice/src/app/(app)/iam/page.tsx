import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'

export default function IAMPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Identity & Access Management</Heading>
        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
          Управление пользователями, ролями и доступом к системе
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">👥</span>
            </div>
            <Heading level={3}>Total Users</Heading>
          </div>
          <Text className="text-2xl font-bold text-blue-600">2,847</Text>
          <Text className="text-sm text-zinc-500">Active accounts</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🔑</span>
            </div>
            <Heading level={3}>Active Sessions</Heading>
          </div>
          <Text className="text-2xl font-bold text-green-600">1,234</Text>
          <Text className="text-sm text-zinc-500">Currently online</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🛡️</span>
            </div>
            <Heading level={3}>Admin Users</Heading>
          </div>
          <Text className="text-2xl font-bold text-orange-600">47</Text>
          <Text className="text-sm text-zinc-500">With elevated access</Text>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">⚠️</span>
            </div>
            <Heading level={3}>Security Alerts</Heading>
          </div>
          <Text className="text-2xl font-bold text-red-600">8</Text>
          <Text className="text-sm text-zinc-500">Require attention</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">User Roles & Permissions</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">👑</span>
                </div>
                <div>
                  <Text className="font-medium">Super Admin</Text>
                  <Text className="text-sm text-zinc-500">Full system access</Text>
                </div>
              </div>
              <Badge color="red">5 users</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">⚡</span>
                </div>
                <div>
                  <Text className="font-medium">Admin</Text>
                  <Text className="text-sm text-zinc-500">Management access</Text>
                </div>
              </div>
              <Badge color="orange">42 users</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">👤</span>
                </div>
                <div>
                  <Text className="font-medium">Manager</Text>
                  <Text className="text-sm text-zinc-500">Limited admin access</Text>
                </div>
              </div>
              <Badge color="blue">156 users</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">👥</span>
                </div>
                <div>
                  <Text className="font-medium">User</Text>
                  <Text className="text-sm text-zinc-500">Basic access</Text>
                </div>
              </div>
              <Badge color="green">2,644 users</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <Heading level={2} className="mb-4">Recent Activity</Heading>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">New user registration</Text>
                <Text className="text-sm text-zinc-500">john.doe@example.com</Text>
              </div>
              <div className="text-right">
                <Badge color="green">Success</Badge>
                <Text className="text-sm text-zinc-500">2 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Failed login attempt</Text>
                <Text className="text-sm text-zinc-500">unknown@example.com</Text>
              </div>
              <div className="text-right">
                <Badge color="red">Alert</Badge>
                <Text className="text-sm text-zinc-500">4 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div>
                <Text className="font-medium">Role permissions updated</Text>
                <Text className="text-sm text-zinc-500">Manager role modified</Text>
              </div>
              <div className="text-right">
                <Badge color="blue">Info</Badge>
                <Text className="text-sm text-zinc-500">6 hours ago</Text>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Password reset requested</Text>
                <Text className="text-sm text-zinc-500">user@company.com</Text>
              </div>
              <div className="text-right">
                <Badge color="orange">Warning</Badge>
                <Text className="text-sm text-zinc-500">8 hours ago</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
