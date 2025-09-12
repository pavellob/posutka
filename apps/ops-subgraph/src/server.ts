import { readFileSync } from 'fs';
import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { OpsDLPrisma } from '@repo/datalayer-prisma';
import { PrismaClient } from '@prisma/client';

const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const prisma = new PrismaClient();
const dl = new OpsDLPrisma(prisma);

const yoga = createYoga({
  schema,
  context: () => ({ dl }), // здесь легко подменить реализацию на другую (e.g. blockchain-DL)
});

const server = createServer(yoga);
server.listen(4003, () => console.log('ops-subgraph on :4003'));
