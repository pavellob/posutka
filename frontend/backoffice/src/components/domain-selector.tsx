'use client'

import { useRouter } from 'next/navigation'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import { SidebarItem, SidebarLabel } from '@/components/sidebar'
import { ChevronDownIcon, PlusIcon, BuildingOfficeIcon } from '@heroicons/react/16/solid'
import { useSelectedOrganization } from '@/hooks/useSelectedOrganization'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function DomainSelector() {
  const router = useRouter()
  const { selectedOrg, changeOrganization, getAllOrganizations } = useSelectedOrganization()
  const { user } = useCurrentUser()

  const handleOrganizationChange = (org: any) => {
    console.log('🔄 DomainSelector handleOrganizationChange called:', { 
      newOrg: org.name, 
      newOrgId: org.id,
      currentOrg: selectedOrg?.name,
      currentOrgId: selectedOrg?.id 
    })
    changeOrganization(org)
    // Здесь можно добавить логику для обновления запросов с новой организацией
  }

  const handleCreateOrganization = () => {
    // Логика создания новой организации
    router.push('/organizations/create')
  }

  if (!selectedOrg) {
    return null
  }

  const organizations = getAllOrganizations()

  return (
    <Dropdown>
      <DropdownButton as={SidebarItem}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedOrg.color}`}>
          <span className="text-white font-semibold text-sm">{selectedOrg.initials}</span>
        </div>
        <SidebarLabel>{selectedOrg.name}</SidebarLabel>
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu className="min-w-80 lg:min-w-64" anchor="bottom start">
        {/* Организации из me */}
        {user?.organizations?.map((org: any) => (
          <DropdownItem 
            key={org.id} 
            href="#" 
            onClick={() => handleOrganizationChange({
              id: org.id,
              name: org.name,
              initials: org.name.substring(0, 2).toUpperCase(),
              color: 'bg-blue-500' // Можно добавить цвет в данные организации
            })}
            className={selectedOrg.id === org.id ? 'bg-zinc-100 dark:bg-zinc-700' : ''}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${org.color || 'bg-blue-500'}`}>
              <span className="text-white font-semibold text-xs">
                {org.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <DropdownLabel>{org.name}</DropdownLabel>
            {selectedOrg.id === org.id && (
              <span className="ml-auto text-xs text-zinc-500">Текущая</span>
            )}
          </DropdownItem>
        ))}
        
        <DropdownDivider />
        <DropdownItem href="#" onClick={handleCreateOrganization}>
          <PlusIcon />
          <DropdownLabel>Создать новую организацию</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
