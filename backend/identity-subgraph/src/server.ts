import { readFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { IdentityDLPrisma, prisma } from '@repo/datalayer-prisma';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('identity-subgraph');

const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

logger.info('Identity Subgraph schema loaded successfully');

const dl = new IdentityDLPrisma(prisma);

logger.info('Identity Subgraph data layer initialized');

const yoga = createYoga({
  schema,
  context: (request) => ({ 
    dl, 
    request: request.request // Передаем request объект в контекст для доступа к заголовкам
  }),
  // Правильная обработка ошибок
  plugins: [
    {
      onRequest: ({ request }) => {
        // Логируем входящие запросы
        logger.info('Incoming request', { 
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers.entries())
        });
      },
    },
  ],
  // Обработка ошибок
  maskedErrors: false, // Показываем реальные ошибки
});

const server = createServer(yoga);
server.listen(4005, () => logger.info('Identity Subgraph server started on port 4005'));
