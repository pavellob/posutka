'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import { SidebarItem, SidebarLabel } from '@/components/sidebar'
import { ChevronDownIcon, Cog8ToothIcon, PlusIcon } from '@heroicons/react/16/solid'

export interface Domain {
  id: string
  name: string
  initials: string
  color: string
  href: string
  icon?: string
}

const domains: Domain[] = [
  { id: 'catalyst', name: 'Каталист', initials: 'К', color: 'bg-gray-500', href: '#', icon: '/teams/catalyst.svg' },
  { id: 'big-events', name: 'Большие События', initials: 'БС', color: 'bg-purple-500', href: '#' },
  { id: 'posutka', name: 'Посутька', initials: 'П', color: 'bg-blue-500', href: '/posutka' },
  { id: 'billing', name: 'Биллинг', initials: 'Б', color: 'bg-green-500', href: '/billing' },
  { id: 'bookings', name: 'Бронирования', initials: 'БК', color: 'bg-orange-500', href: '/bookings' },
  { id: 'iam', name: 'Идентичность и Доступ', initials: 'ИД', color: 'bg-red-500', href: '/iam' },
  { id: 'inventory', name: 'Инвентарь', initials: 'И', color: 'bg-yellow-500', href: '/inventory' },
  { id: 'legal', name: 'Правовые', initials: 'П', color: 'bg-indigo-500', href: '/legal' },
  { id: 'object-service', name: 'Сервис Объектов', initials: 'СО', color: 'bg-pink-500', href: '/object-service' },
  { id: 'placement', name: 'Размещение', initials: 'Р', color: 'bg-teal-500', href: '/placement' },
  { id: 'procurement', name: 'Закупки', initials: 'З', color: 'bg-cyan-500', href: '/procurement' },
  { id: 'services', name: 'Сервисы', initials: 'С', color: 'bg-gray-500', href: '/services' },
  { id: 'ai-subgraph', name: 'ИИ Подграф', initials: 'ИИ', color: 'bg-emerald-500', href: '/ai-subgraph' },
  { id: 'listings', name: 'Объявления', initials: 'О', color: 'bg-violet-500', href: '/listings' },
  { id: 'operations', name: 'Операции', initials: 'ОП', color: 'bg-slate-500', href: '/operations' },
]

export function DomainSelector() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentDomain, setCurrentDomain] = useState<Domain>(domains[0]) // Default to Catalyst

  useEffect(() => {
    // Find the current domain based on the pathname
    const domain = domains.find(d => pathname.startsWith(d.href) && d.href !== '#')
    if (domain) {
      setCurrentDomain(domain)
    } else if (pathname === '/') {
      // If we're on the home page, default to Posutka
      const posutkaDomain = domains.find(d => d.id === 'posutka')
      if (posutkaDomain) {
        setCurrentDomain(posutkaDomain)
      }
    }
  }, [pathname])

  const handleDomainChange = (domain: Domain) => {
    setCurrentDomain(domain)
    if (domain.href !== '#') {
      router.push(domain.href)
    }
  }

  return (
    <Dropdown>
      <DropdownButton as={SidebarItem}>
        {currentDomain.icon ? (
          <img src={currentDomain.icon} alt={currentDomain.name} className="w-8 h-8 rounded" />
        ) : (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentDomain.color}`}>
            <span className="text-white font-semibold text-sm">{currentDomain.initials}</span>
          </div>
        )}
        <SidebarLabel>{currentDomain.name}</SidebarLabel>
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu className="min-w-80 lg:min-w-64" anchor="bottom start">
        <DropdownItem href="/settings">
          <Cog8ToothIcon />
          <DropdownLabel>Настройки</DropdownLabel>
        </DropdownItem>
        <DropdownDivider />
        
        {/* Original domains */}
        <DropdownItem 
          href="#" 
          onClick={() => handleDomainChange(domains.find(d => d.id === 'catalyst')!)}
          className={currentDomain.id === 'catalyst' ? 'bg-zinc-100 dark:bg-zinc-700' : ''}
        >
          <img src="/teams/catalyst.svg" alt="Catalyst" className="w-6 h-6 rounded" />
          <DropdownLabel>Каталист</DropdownLabel>
          {currentDomain.id === 'catalyst' && (
            <span className="ml-auto text-xs text-zinc-500">Текущий</span>
          )}
        </DropdownItem>
        <DropdownItem 
          href="#" 
          onClick={() => handleDomainChange(domains.find(d => d.id === 'big-events')!)}
          className={currentDomain.id === 'big-events' ? 'bg-zinc-100 dark:bg-zinc-700' : ''}
        >
          <div className="w-6 h-6 rounded-lg bg-purple-500 flex items-center justify-center">
            <span className="text-white font-semibold text-xs">BE</span>
          </div>
          <DropdownLabel>Большие События</DropdownLabel>
          {currentDomain.id === 'big-events' && (
            <span className="ml-auto text-xs text-zinc-500">Текущий</span>
          )}
        </DropdownItem>
        
        <DropdownDivider />
        
        {/* Posutka Domains */}
        {domains.filter(d => d.href !== '#').map((domain) => (
          <DropdownItem 
            key={domain.id} 
            href={domain.href} 
            onClick={() => handleDomainChange(domain)}
            className={currentDomain.id === domain.id ? 'bg-zinc-100 dark:bg-zinc-700' : ''}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${domain.color}`}>
              <span className="text-white font-semibold text-xs">{domain.initials}</span>
            </div>
            <DropdownLabel>{domain.name}</DropdownLabel>
            {currentDomain.id === domain.id && (
              <span className="ml-auto text-xs text-zinc-500">Текущий</span>
            )}
          </DropdownItem>
        ))}
        
        <DropdownDivider />
        <DropdownItem href="#">
          <PlusIcon />
          <DropdownLabel>Новая команда&hellip;</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
