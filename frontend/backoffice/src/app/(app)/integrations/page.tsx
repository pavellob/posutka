'use client'

import { useState } from 'react'
import { Heading } from '@/components/heading'
import { Divider } from '@/components/divider'
import { RealtyCalendarTab } from './realty-calendar-tab'

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'realty-calendar'>('realty-calendar')

  return (
    <div className="mx-auto max-w-6xl">
      <Heading>Интеграции</Heading>
      <Divider className="my-6" />

      {/* Вкладки */}
      <div className="border-b border-gray-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('realty-calendar')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'realty-calendar'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            📅 Calendar Realty
          </button>
        </nav>
      </div>

      {/* Контент вкладок */}
      <div className="mt-6">
        {activeTab === 'realty-calendar' && <RealtyCalendarTab />}
      </div>
    </div>
  )
}

