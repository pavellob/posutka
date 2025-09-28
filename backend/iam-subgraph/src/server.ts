import { readFileSync } from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { IdentityDLPrisma, prisma } from '@repo/datalayer-prisma';
import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('iam-subgraph');

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
