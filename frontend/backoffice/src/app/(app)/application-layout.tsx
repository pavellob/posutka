'use client'

import { Avatar } from '@/components/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/sidebar'
import { SidebarLayout } from '@/components/sidebar-layout'
import { DomainSelector } from '@/components/domain-selector'
import { getEvents } from '@/data'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'
import {
  Cog6ToothIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square2StackIcon,
  TicketIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

function AccountDropdownMenu({ anchor }: { anchor: 'top start' | 'bottom end' }) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="#">
        <UserCircleIcon />
        <DropdownLabel>My account</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="#">
        <ShieldCheckIcon />
        <DropdownLabel>Privacy policy</DropdownLabel>
      </DropdownItem>
      <DropdownItem href="#">
        <LightBulbIcon />
        <DropdownLabel>Share feedback</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="/login">
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

export function ApplicationLayout({
  events,
  children,
}: {
  events: Awaited<ReturnType<typeof getEvents>>
  children: React.ReactNode
}) {
  let pathname = usePathname()

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Avatar src="/users/erica.jpg" square />
              </DropdownButton>
              <AccountDropdownMenu anchor="bottom end" />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <DomainSelector />
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/" current={pathname === '/'}>
                <HomeIcon />
                <SidebarLabel>Главная</SidebarLabel>
              </SidebarItem>
              {pathname.startsWith('/posutka') || pathname === '/' ? (
                <>
                  <SidebarItem href="/events" current={pathname.startsWith('/events')}>
                    <Square2StackIcon />
                    <SidebarLabel>События</SidebarLabel>
                  </SidebarItem>
                  <SidebarItem href="/orders" current={pathname.startsWith('/orders')}>
                    <TicketIcon />
                    <SidebarLabel>Заказы</SidebarLabel>
                  </SidebarItem>
                </>
              ) : null}
              <SidebarItem href="/settings" current={pathname.startsWith('/settings')}>
                <Cog6ToothIcon />
                <SidebarLabel>Настройки</SidebarLabel>
              </SidebarItem>
            </SidebarSection>

            <SidebarSection className="max-lg:hidden">
              <SidebarHeading>Ближайшие События</SidebarHeading>
              {events.map((event) => (
                <SidebarItem key={event.id} href={event.url}>
                  {event.name}
                </SidebarItem>
              ))}
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
                    <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">Erica</span>
                    <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                      erica@example.com
                    </span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountDropdownMenu anchor="top start" />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  )
}
