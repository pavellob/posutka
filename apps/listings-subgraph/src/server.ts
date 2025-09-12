import path from 'path';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';

import { resolvers } from './resolvers/index.js';
import { ListingsDLPrisma } from '@repo/datalayer-prisma';
import { PrismaClient } from '@prisma/client';
import { createFullSchema } from '@repo/shared';

const typeDefs = createFullSchema(path.join(process.cwd(), 'src/schema/index.gql'));
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const prisma = new PrismaClient();
const dl = new ListingsDLPrisma(prisma);

const yoga = createYoga({
  schema,
  context: () => ({ dl }), // здесь легко подменить реализацию на другую (e.g. blockchain-DL)
});

const server = createServer(yoga);
server.listen(4006, () => console.log('listings-subgraph on :4006'));
