try {
  const { buildSubgraphSchema } = require('@apollo/subgraph');
  const { createYoga } = require('graphql-yoga');
  const { createServer } = require('http');
  const gql = require('graphql-tag');
  
  console.log('✅ All dependencies loaded successfully');
  
  const resolvers = {
    Query: {
      task: () => ({ 
        id: 'test-task', 
        type: 'CLEANING',
        status: 'TODO',
        checklist: ['Kitchen', 'Bathroom'],
        dueAt: '2025-01-15T10:00:00.000Z'
      }),
      tasks: () => ({
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0
      }),
      serviceProvider: () => ({
        id: 'test-provider',
        name: 'Test Cleaning Service',
        serviceTypes: ['CLEANING', 'MAINTENANCE'],
        rating: 4.5,
        contact: '+7-999-123-45-67'
      })
    },
    Mutation: {
      createTask: () => ({ 
        id: 'new-task', 
        type: 'CLEANING',
        status: 'TODO',
        checklist: ['Kitchen', 'Bathroom']
      }),
      assignTask: () => ({
        id: 'assigned-task',
        status: 'IN_PROGRESS',
        assignedTo: {
          id: 'provider-1',
          name: 'Cleaning Service'
        }
      })
    }
  };
  
  const typeDefs = gql`
    extend schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])
    scalar UUID
    scalar DateTime
    scalar Money
    type Query { 
      task(id: UUID!): Task
      tasks(orgId: UUID!, status: TaskStatus, type: TaskType, first: Int, after: String): TaskConnection!
      serviceProvider(id: UUID!): ServiceProvider
    }
    type Mutation {
      createTask(input: CreateTaskInput!): Task!
      assignTask(input: AssignTaskInput!): Task!
    }
    type Task @key(fields: "id") { 
      id: UUID!
      type: TaskType!
      status: TaskStatus!
      checklist: [String!]!
      dueAt: DateTime
      assignedTo: ServiceProvider
    }
    type ServiceProvider @key(fields: "id") {
      id: UUID!
      name: String!
      serviceTypes: [TaskType!]!
      rating: Float
      contact: String
    }
    type TaskConnection {
      edges: [TaskEdge!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }
    type TaskEdge {
      node: Task!
      cursor: String!
    }
    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
    }
    input CreateTaskInput {
      orgId: UUID!
      type: TaskType!
      unitId: UUID
      bookingId: UUID
      checklist: [String!]
    }
    input AssignTaskInput {
      taskId: UUID!
      providerId: UUID
      status: TaskStatus
    }
    enum TaskStatus {
      TODO
      IN_PROGRESS
      DONE
      CANCELED
    }
    enum TaskType {
      CLEANING
      CHECKIN
      CHECKOUT
      MAINTENANCE
      INVENTORY
    }
  `;
  
  console.log('✅ Schema created');
  
  const schema = buildSubgraphSchema({ typeDefs, resolvers });
  console.log('✅ Subgraph schema built');
  
  const yoga = createYoga({ schema });
  console.log('✅ Yoga created');
  
  const server = createServer(yoga);
  console.log('✅ Server created');
  
  server.listen(4003, () => {
    console.log('🚀 ops-subgraph running on http://localhost:4003/graphql');
    console.log('💡 Try this query:');
    console.log('   query { task(id: "test") { id type status checklist } }');
    console.log('   query { serviceProvider(id: "test") { id name serviceTypes rating } }');
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
