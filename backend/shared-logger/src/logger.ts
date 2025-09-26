import pino from 'pino';

// Конфигурация для разных уровней логирования
const createLogger = (service: string, level: string = 'info') => {
  return pino({
    name: service,
    level: level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: `[${service}] {msg}`,
      },
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
  });
};

// Создаем логгеры для каждого сервиса
export const createServiceLogger = (service: string) => {
  const logger = createLogger(service);
  
  return {
    info: (message: string, data?: any) => logger.info(data, message),
    error: (message: string, error?: any, data?: any) => logger.error({ error, ...data }, message),
    warn: (message: string, data?: any) => logger.warn(data, message),
    debug: (message: string, data?: any) => logger.debug(data, message),
    trace: (message: string, data?: any) => logger.trace(data, message),
    fatal: (message: string, error?: any, data?: any) => logger.fatal({ error, ...data }, message),
  };
};

// Экспортируем типы для TypeScript
export type ServiceLogger = ReturnType<typeof createServiceLogger>;

// Утилиты для логирования GraphQL операций
export const createGraphQLLogger = (service: string) => {
  const logger = createServiceLogger(service);
  
  return {
    ...logger,
    graphqlQuery: (operation: string, variables?: any, executionTime?: number) => {
      logger.info(`GraphQL ${operation}`, {
        operation,
        variables,
        executionTime: executionTime ? `${executionTime}ms` : undefined,
      });
    },
    graphqlError: (operation: string, error: any, variables?: any) => {
      logger.error(`GraphQL ${operation} failed`, error, {
        operation,
        variables,
      });
    },
    resolverStart: (resolver: string, args?: any) => {
      logger.debug(`Resolver ${resolver} started`, { resolver, args });
    },
    resolverEnd: (resolver: string, result?: any, executionTime?: number) => {
      logger.debug(`Resolver ${resolver} completed`, {
        resolver,
        resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
        executionTime: executionTime ? `${executionTime}ms` : undefined,
      });
    },
  };
};

export type GraphQLLogger = ReturnType<typeof createGraphQLLogger>;
