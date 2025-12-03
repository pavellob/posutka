'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { graphqlClient } from '@/lib/graphql-client'
import { useMutation } from '@tanstack/react-query'

// Импортируем GraphQL мутацию
const IMPORT_REALTY_CALENDAR_FEED = `
  mutation ImportRealtyCalendarFeed($orgId: String!, $xmlContent: String!) {
    importRealtyCalendarFeed(orgId: $orgId, xmlContent: $xmlContent) {
      success
      outcome
      processed
      created
      updated
      errors {
        offerId
        message
      }
    }
  }
`

export function RealtyCalendarTab() {
  const { currentOrgId } = useCurrentOrganization()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  const importFeedMutation = useMutation({
    mutationFn: async ({ orgId, xmlContent }: { orgId: string; xmlContent: string }) => {
      return graphqlClient.request(IMPORT_REALTY_CALENDAR_FEED, {
        orgId,
        xmlContent,
      })
    },
    onSuccess: (result: any) => {
      const data = result.importRealtyCalendarFeed
      if (data.success) {
        setUploadResult({
          success: true,
          message: `Успешно обработано: ${data.processed} объектов, создано: ${data.created}, обновлено: ${data.updated}`,
          details: data,
        })
        // Очищаем выбранный файл
        setSelectedFile(null)
        const fileInput = document.getElementById('xml-file-input') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
      } else {
        setUploadResult({
          success: false,
          message: `Ошибка при обработке файла: ${data.outcome}`,
          details: data,
        })
      }
    },
    onError: (error: any) => {
      setUploadResult({
        success: false,
        message: `Ошибка: ${error.message || 'Не удалось загрузить файл'}`,
      })
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/xml' && file.type !== 'application/xml' && !file.name.endsWith('.xml')) {
        setUploadResult({
          success: false,
          message: 'Пожалуйста, выберите XML файл',
        })
        return
      }
      setSelectedFile(file)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadResult({
        success: false,
        message: 'Пожалуйста, выберите файл для загрузки',
      })
      return
    }

    if (!currentOrgId) {
      setUploadResult({
        success: false,
        message: 'Организация не выбрана',
      })
      return
    }

    setUploadResult(null)

    try {
      // Читаем файл
      const fileContent = await selectedFile.text()

      // Вызываем GraphQL мутацию
      await importFeedMutation.mutateAsync({
        orgId: currentOrgId,
        xmlContent: fileContent,
      })
    } catch (error: any) {
      // Ошибка уже обработана в onError
      console.error('Upload error:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Subheading>Загрузка объектов из Calendar Realty</Subheading>
        <Text className="mt-1 text-gray-600 dark:text-gray-400">
          Загрузите XML файл с объектами недвижимости из Calendar Realty. Система автоматически создаст или обновит объекты и юниты в вашей организации.
        </Text>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-zinc-700 p-6 bg-white dark:bg-zinc-900">
        <div className="space-y-4">
          <div>
            <label htmlFor="xml-file-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Выберите XML файл
            </label>
            <input
              id="xml-file-input"
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-black file:text-white
                hover:file:bg-gray-800
                dark:file:bg-white dark:file:text-black
                dark:hover:file:bg-gray-200"
              disabled={importFeedMutation.isPending}
            />
            {selectedFile && (
              <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Выбран файл: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </Text>
            )}
          </div>

          {uploadResult && (
            <div
              className={`p-4 rounded-lg ${
                uploadResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <Text
                className={
                  uploadResult.success
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-red-800 dark:text-red-300'
                }
              >
                {uploadResult.message}
              </Text>
              {uploadResult.details && uploadResult.details.errors && uploadResult.details.errors.length > 0 && (
                <div className="mt-2">
                  <Text className="text-sm font-semibold">Ошибки при обработке:</Text>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {uploadResult.details.errors.map((error: any, index: number) => (
                      <li key={index} className="text-sm">
                        Объект {error.offerId}: {error.message || error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || importFeedMutation.isPending || !currentOrgId}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {importFeedMutation.isPending ? 'Загрузка...' : 'Загрузить и обработать'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-zinc-700 p-6 bg-white dark:bg-zinc-900">
        <Subheading>Информация</Subheading>
        <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <Text>
            • Файл должен быть в формате XML, соответствующем схеме Calendar Realty
          </Text>
          <Text>
            • Система автоматически создаст объекты недвижимости (Property) и юниты (Unit) на основе данных из XML
          </Text>
          <Text>
            • Если объект с таким external-id уже существует, он будет обновлен
          </Text>
          <Text>
            • Все объекты будут привязаны к вашей текущей организации: {currentOrgId || 'не выбрана'}
          </Text>
        </div>
      </div>
    </div>
  )
}

