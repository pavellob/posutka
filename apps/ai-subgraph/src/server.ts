import { readFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { AIOrchestratorPrisma } from '@repo/datalayer-prisma';
import { PrismaClient } from '@prisma/client';

const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const prisma = new PrismaClient();
const orchestrator = new AIOrchestratorPrisma(prisma);

const yoga = createYoga({
  schema,
  context: () => ({ orchestrator }), // здесь легко подменить реализацию на другую (e.g. blockchain-orchestrator)
});

const server = createServer(yoga);
server.listen(4008, () => console.log('ai-subgraph on :4008'));
