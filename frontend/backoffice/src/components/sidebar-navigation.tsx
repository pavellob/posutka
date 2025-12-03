'use client'

import { usePathname } from 'next/navigation'
import { Sidebar, SidebarBody, SidebarHeader, SidebarItem, SidebarLabel, SidebarSection, SidebarHeading, SidebarFooter, SidebarSpacer } from './sidebar'
import { DomainSelector } from './domain-selector'
import { Avatar } from './avatar'
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from './dropdown'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ChevronUpIcon, QuestionMarkCircleIcon, SparklesIcon } from '@heroicons/react/16/solid'
import { 
  HomeIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  CogIcon,
  UserGroupIcon,
  BellIcon,
  CreditCardIcon,
  ScaleIcon,
  MapPinIcon,
  ShoppingCartIcon,
  CpuChipIcon,
  ListBulletIcon,
  WrenchScrewdriverIcon,
  UserIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import { SparklesIcon as SparklesIconSolid } from '@heroicons/react/24/solid'

const navigationItems = [
  { name: 'Главная', href: '/', icon: HomeIcon },
  { name: 'Объекты', href: '/inventory', icon: BuildingOfficeIcon },
  { name: 'Бронирования', href: '/bookings', icon: CalendarDaysIcon },
  { name: 'Задачи', href: '/tasks', icon: WrenchScrewdriverIcon },
  { name: 'Уборки', href: '/cleanings', icon: SparklesIconSolid },
  { name: 'Ремонты', href: '/repairs', icon: CogIcon },
  { name: 'Пользователи', href: '/iam', icon: UserGroupIcon },
  { name: 'Уведомления', href: '/notifications', icon: BellIcon },
  { name: 'Деньги', href: '/billing', icon: CreditCardIcon },
  { name: 'Размещение', href: '/placement', icon: MapPinIcon },
  { name: 'Закупки', href: '/procurement', icon: ShoppingCartIcon },
  { name: 'Правовые', href: '/legal', icon: ScaleIcon },
  { name: 'ИИ Подграф', href: '/ai-subgraph', icon: CpuChipIcon },
  { name: 'Интеграции', href: '/integrations', icon: LinkIcon },
]

function AccountDropdownMenu({ anchor }: { anchor: 'top start' | 'bottom end' }) {
  const { user, loading } = useCurrentUser()

  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="#">
        <DropdownLabel>My account</DropdownLabel>
      </DropdownItem>
      <DropdownItem href="#">
        <DropdownLabel>Security</DropdownLabel>
      </DropdownItem>
      <DropdownItem href="#">
        <DropdownLabel>Share feedback</DropdownLabel>
      </DropdownItem>
      <DropdownItem onClick={() => {
        import('@/lib/graphql-client').then(({ logout }) => logout());
      }}>
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

export function SidebarNavigation() {
  const pathname = usePathname()
  const { user, loading } = useCurrentUser()

  return (
    <Sidebar>
      <SidebarHeader>
        <DomainSelector />
      </SidebarHeader>
      
      <SidebarBody>
        <SidebarSection>
          <SidebarHeading>Навигация</SidebarHeading>
          {navigationItems.map((item) => {
            const isCurrent = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <SidebarItem key={item.name} href={item.href} current={isCurrent}>
                <item.icon />
                <SidebarLabel>{item.name}</SidebarLabel>
              </SidebarItem>
            )
          })}
        </SidebarSection>

        <SidebarSpacer />

        <SidebarSection>
          <SidebarItem href="#">
            <QuestionMarkCircleIcon />
            <SidebarLabel>Поддержка</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="#">
            <SparklesIcon />
            <SidebarLabel>История Изменений</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter className="max-lg:hidden">
        <Dropdown>
          <DropdownButton as={SidebarItem}>
            <span className="flex min-w-0 items-center gap-3">
              <Avatar src="/users/erica.jpg" className="size-10" square alt="" />
              <span className="min-w-0">
                <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                  {loading ? 'Loading...' : user?.name || 'User'}
                </span>
                <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                  {loading ? 'Loading...' : user?.email || 'user@example.com'}
                </span>
              </span>
            </span>
            <ChevronUpIcon />
          </DropdownButton>
          <AccountDropdownMenu anchor="top start" />
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  )
}
