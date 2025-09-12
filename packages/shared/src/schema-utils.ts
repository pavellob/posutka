import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { buildSchema, printSchema } from 'graphql'
import { mergeSchemas } from '@graphql-tools/schema'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Загружает общую схему из shared пакета
 */
export function loadSharedSchema(): string {
  const sharedSchemaPath = join(__dirname, 'schema.gql')
  return readFileSync(sharedSchemaPath, 'utf-8')
}

/**
 * Комбинирует общую схему с локальной схемой субграфа используя GraphQL Tools
 * @param localSchemaPath - путь к локальной схеме субграфа
 * @returns объединенная схема
 */
export function combineSchemas(localSchemaPath: string): string {
  const sharedSchema = loadSharedSchema()
  const localSchema = readFileSync(localSchemaPath, 'utf-8')
  
  // Создаем схемы
  const sharedGraphQLSchema = buildSchema(sharedSchema)
  const localGraphQLSchema = buildSchema(localSchema)
  
  // Объединяем схемы
  const mergedSchema = mergeSchemas({
    schemas: [sharedGraphQLSchema, localGraphQLSchema]
  })
  
  // Возвращаем как строку
  return printSchema(mergedSchema)
}

/**
 * Создает полную схему для субграфа с Query и Mutation
 * @param localSchemaPath - путь к локальной схеме субграфа
 * @returns полная схема с корневыми типами
 */
export function createFullSchema(localSchemaPath: string): string {
  const combinedSchema = combineSchemas(localSchemaPath)
  
  // Проверяем, есть ли уже Query или Mutation в схеме
  const hasQuery = combinedSchema.includes('type Query')
  const hasMutation = combinedSchema.includes('type Mutation')
  
  let fullSchema = combinedSchema
  
  // Добавляем пустые Query и Mutation если их нет
  if (!hasQuery) {
    fullSchema += '\n\ntype Query {\n  _empty: Boolean\n}'
  }
  
  if (!hasMutation) {
    fullSchema += '\n\ntype Mutation {\n  _empty: Boolean\n}'
  }
  
  return fullSchema
}
