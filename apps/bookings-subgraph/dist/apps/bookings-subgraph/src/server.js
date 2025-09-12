import { readFileSync } from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { resolvers } from './resolvers/index.js';
import { BookingsDLPrisma, IdentityDLPrisma, InventoryDLPrisma } from '@repo/datalayer-prisma';
import { PrismaClient } from '@prisma/client';
const typeDefs = readFileSync(path.join(process.cwd(), 'src/schema/index.gql'), 'utf8');
const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});
const prisma = new PrismaClient();
const dl = new BookingsDLPrisma(prisma);
const identityDL = new IdentityDLPrisma(prisma);
const inventoryDL = new InventoryDLPrisma(prisma);
const yoga = createYoga({
    schema,
    context: () => ({ dl, identityDL, inventoryDL }), // здесь легко подменить реализацию на другую (e.g. blockchain-DL)
});
const server = createServer(yoga);
server.listen(4002, () => console.log('bookings-subgraph on :4002'));
