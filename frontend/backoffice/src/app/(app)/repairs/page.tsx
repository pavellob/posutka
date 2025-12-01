'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/table'
import { Select } from '@/components/select'
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/dropdown'
import { Squares2X2Icon, TableCellsIcon, ViewColumnsIcon, EllipsisVerticalIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Link } from '@/components/link'
import { graphqlClient } from '@/lib/graphql-client'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { usePathname } from 'next/navigation'
import { GET_REPAIRS, GET_MASTERS, CANCEL_REPAIR } from '@/lib/graphql-queries'
import { RepairCard } from '@/components/repair-card'
import { RepairKanbanBoard } from '@/components/repair-kanban-board'

function RepairsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'kanban'>('table')
  const [filters, setFilters] = useState({
    status: '',
    masterId: ''
  })
  
  const queryClient = useQueryClient()
  const { currentOrgId, isLoading: orgLoading } = useCurrentOrganization()
  const orgId = currentOrgId

  // Запрос ремонтов
  const { data: repairsData, isLoading: repairsLoading } = useQuery<any>({
    queryKey: ['repairs', orgId, filters.status, filters.masterId],
    queryFn: () => graphqlClient.request(GET_REPAIRS, {
      orgId: orgId!,
      status: filters.status || undefined,
      masterId: filters.masterId || undefined,
      first: 50
    }),
    enabled: !!orgId
  })

  // Запрос мастеров для фильтра
  const { data: mastersData } = useQuery<any>({
    queryKey: ['masters', orgId],
    queryFn: () => graphqlClient.request(GET_MASTERS, {
      orgId: orgId!,
      first: 100
    }),
    enabled: !!orgId
  })

  const cancelRepairMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      graphqlClient.request(CANCEL_REPAIR, { id, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] })
    }
  })

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PLANNED': { color: 'orange' as const, text: 'Запланирован' },
      'IN_PROGRESS': { color: 'blue' as const, text: 'В процессе' },
      'COMPLETED': { color: 'green' as const, text: 'Завершён' },
      'CANCELLED': { color: 'red' as const, text: 'Отменён' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'zinc' as const, text: status }
    return <Badge color={statusInfo.color}>{statusInfo.text}</Badge>
  }

  const repairs = repairsData?.repairs?.edges?.map((edge: any) => edge.node) || []
  const masters = mastersData?.masters?.edges?.map((edge: any) => edge.node) || []

  if (orgLoading || !orgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Text>Загрузка организации...</Text>
      </div>
    )
  }

  if (repairsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Text>Загрузка ремонтов...</Text>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Heading level={1}>Ремонты</Heading>
        <Button
          onClick={() => router.push('/repairs/new')}
          className="bg-black hover:bg-gray-800 text-white border-gray-600 w-full sm:w-auto"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Создать ремонт
        </Button>
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/repairs"
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${pathname === '/repairs'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            🔧 Ремонты ({repairs.length})
          </Link>
          <Link
            href="/repairs/masters"
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${pathname === '/repairs/masters'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            👷 Ремонтники
          </Link>
        </nav>
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Статус</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Все статусы</option>
              <option value="PLANNED">Запланирован</option>
              <option value="IN_PROGRESS">В процессе</option>
              <option value="COMPLETED">Завершён</option>
              <option value="CANCELLED">Отменён</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Мастер</label>
            <Select
              value={filters.masterId}
              onChange={(e) => setFilters({ ...filters, masterId: e.target.value })}
            >
              <option value="">Все мастера</option>
              {masters.map((master: any) => (
                <option key={master.id} value={master.id}>
                  {master.firstName} {master.lastName}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Ремонты */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Heading level={2}>Ремонты ({repairs.length})</Heading>
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
            <Button
              onClick={() => setViewMode('table')}
              className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-0 text-gray-700 dark:text-gray-300 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
              title="Таблица"
            >
              <TableCellsIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setViewMode('cards')}
              className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-0 text-gray-700 dark:text-gray-300 ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
              title="Карточки"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setViewMode('kanban')}
              className={`p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-zinc-600 border-0 text-gray-700 dark:text-gray-300 ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''}`}
              title="Канбан"
            >
              <ViewColumnsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {repairs.length === 0 ? (
          <div className="text-center py-12">
            <Text className="text-gray-500 dark:text-gray-400">
              Ремонтов не найдено
            </Text>
          </div>
        ) : viewMode === 'kanban' ? (
          <RepairKanbanBoard
            repairs={repairs}
            onUpdateStatus={(repairId, status) => {
              if (status === 'COMPLETED') {
                router.push(`/repairs/${repairId}`)
              } else if (status === 'IN_PROGRESS') {
                router.push(`/repairs/${repairId}`)
              } else if (status === 'CANCELLED') {
                if (confirm('Отменить ремонт?')) {
                  cancelRepairMutation.mutate({ id: repairId })
                }
              }
            }}
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {repairs.map((repair: any) => (
              <RepairCard
                key={repair.id}
                repair={repair}
                onUpdateStatus={(repairId, status) => {
                  if (status === 'COMPLETED') {
                    router.push(`/repairs/${repairId}`)
                  }
                }}
                onStartRepair={(repair) => {
                  router.push(`/repairs/${repair.id}`)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader className="hidden sm:table-cell">ID</TableHeader>
                    <TableHeader>Квартира</TableHeader>
                    <TableHeader className="hidden md:table-cell">Мастер</TableHeader>
                    <TableHeader>Статус</TableHeader>
                    <TableHeader className="hidden lg:table-cell">Запланирован</TableHeader>
                    <TableHeader>Действия</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {repairs.map((repair: any) => (
                    <TableRow 
                      key={repair.id}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150 cursor-pointer"
                      onClick={() => router.push(`/repairs/${repair.id}`)}
                    >
                      <TableCell className="hidden sm:table-cell">
                        <Text className="font-mono text-sm">{repair.id.slice(0, 8)}</Text>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Text className="font-medium">
                            {repair.unit?.property?.title || '—'}
                          </Text>
                          <Text className="text-sm text-zinc-500">
                            {repair.unit?.name || '—'}
                          </Text>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {repair.master ? (
                          <Text>
                            {repair.master.firstName} {repair.master.lastName}
                          </Text>
                        ) : (
                          <Text className="text-zinc-500">Не назначен</Text>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(repair.status)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {repair.scheduledAt ? (
                          <Text className="text-sm">
                            {new Date(repair.scheduledAt).toLocaleString('ru-RU')}
                          </Text>
                        ) : (
                          <Text className="text-zinc-500">—</Text>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Dropdown>
                          <DropdownButton>
                            <EllipsisVerticalIcon className="w-5 h-5" />
                          </DropdownButton>
                          <DropdownMenu>
                            {repair.status !== 'CANCELLED' && repair.status !== 'COMPLETED' && (
                              <DropdownItem
                                onClick={() => {
                                  if (confirm('Отменить ремонт?')) {
                                    cancelRepairMutation.mutate({ id: repair.id })
                                  }
                                }}
                              >
                                Отменить
                              </DropdownItem>
                            )}
                          </DropdownMenu>
                        </Dropdown>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RepairsPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <RepairsPageContent />
    </Suspense>
  )
}
