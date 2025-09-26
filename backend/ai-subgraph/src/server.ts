import { readFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { AIOrchestratorPrisma } from '@repo/datalayer-prisma';
import { createContext } from './context.js';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('ai-subgraph');

const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

logger.info('AI Subgraph schema loaded successfully');

// Используем новый контекст с GQLPT поддержкой
// const prisma = new PrismaClient();
// const orchestrator = new AIOrchestratorPrisma(prisma);

const yoga = createYoga({
  schema,
  context: createContext, // используем новый контекст с GQLPT поддержкой
});

const server = createServer(yoga);
server.listen(4008, () => logger.info('AI Subgraph server started on port 4008'));
