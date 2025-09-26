import { readFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { IdentityDLPrisma } from '@repo/datalayer-prisma';
import { PrismaClient } from '@prisma/client';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('identity-subgraph');

const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

logger.info('Identity Subgraph schema loaded successfully');

const prisma = new PrismaClient();
const dl = new IdentityDLPrisma(prisma);

logger.info('Identity Subgraph data layer initialized');

const yoga = createYoga({
  schema,
  context: () => ({ dl }), // здесь легко подменить реализацию на другую (e.g. blockchain-DL)
});

const server = createServer(yoga);
server.listen(4005, () => logger.info('Identity Subgraph server started on port 4005'));
