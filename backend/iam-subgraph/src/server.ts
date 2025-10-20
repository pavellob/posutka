import { readFileSync } from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { IdentityDLPrisma } from '@repo/datalayer-prisma';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('iam-subgraph');

// Отладка переменных окружения при старте
logger.info('🔍 Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET',
});

// ✅ Создаем PrismaClient внутри, когда переменные уже загружены
const dbUrl = process.env.DATABASE_URL || '';
logger.info('🔍 Creating PrismaClient:', {
  hasUrl: !!dbUrl,
  connectionString: dbUrl ? `${dbUrl.split('@')[0].split('://')[0]}://***@${dbUrl.split('@')[1] || 'NO_HOST'}` : '❌ NOT SET',
});

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl, // Явно передаем URL из process.env, игнорируя .env файлы
    },
  },
  log: ['error', 'warn'],
});

// Логируем реальный URL который использует Prisma
logger.info('🔍 PrismaClient datasource URL:', {
  fromEnv: dbUrl.substring(0, 60) + '...',
  host: dbUrl.split('@')[1]?.split('/')[0] || 'UNKNOWN',
});

const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

logger.info('IAM Subgraph schema loaded successfully');

const dl = new IdentityDLPrisma(prisma);

logger.info('IAM Subgraph data layer initialized');

const yoga = createYoga({
  schema,
  context: (request) => ({
    dl,
    request: request.request
  }),
});

const server = createServer(yoga);
server.listen(4009, () => logger.info('IAM Subgraph server started on port 4009'));
