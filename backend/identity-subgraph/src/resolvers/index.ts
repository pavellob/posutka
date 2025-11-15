import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const logger = createGraphQLLogger('identity-resolvers');

// JWT конфигурация
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_EXPIRES_IN = '1h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Функция для генерации токенов
function generateTokens(user: any) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
}

// Функция для извлечения userId из JWT токена
function extractUserIdFromToken(authorization?: string): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authorization.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId;
  } catch (error: any) {
    logger.error('JWT verification failed', { error: error.message });
    
    // Если токен истек, выбрасываем ошибку
    if (error.name === 'TokenExpiredError') {
      throw new Error('JWT token expired');
    }
    
    // Если токен недействителен, выбрасываем ошибку
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid JWT token');
    }
    
    return null;
  }
}

// Функция для извлечения токена из контекста GraphQL Yoga
function getAuthorizationFromContext(context: any): string | null {
  // GraphQL Yoga может передавать заголовки по-разному
  const headers = context.req?.headers || context.headers;
  return headers?.authorization || headers?.Authorization || null;
}

export const resolvers: any = {
  Query: {
    // Новый резолвер для получения текущего пользователя
    async me(_: unknown, __: unknown, context: any) {
      try {
        logger.info('me resolver called', { contextKeys: Object.keys(context) });
        
        // Извлекаем токен из заголовка Authorization
        const authorization = getAuthorizationFromContext(context);
        logger.info('authorization header', { authorization });
        
        const userId = extractUserIdFromToken(authorization!);
        
        if (!userId) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        
        const user = await context.dl.getUserById(userId);
        if (!user) {
          throw new Error('User not found');
        }
        
        logger.info('me resolver completed', { userId });
        return user;
      } catch (error: any) {
        logger.error('me resolver failed', { error: error.message, stack: error.stack });
        throw error;
      }
    },
    
    user: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getUserById(id),
    userByEmail: (_: unknown, { email }: { email: string }, { dl }: Context) => dl.getUserByEmail(email),
    users: (_: unknown, params: any, { dl }: Context) => dl.listUsers(params),
    
    organization: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getOrganizationById(id),
    organizations: async (_: unknown, params: any, { dl }: Context) => {
      logger.resolverStart('organizations', params);
      const result = await dl.listOrganizations(params);
      logger.resolverEnd('organizations', result);
      logger.info('GraphQL resolver organizations completed', { 
        params, 
        resultCount: Array.isArray(result) ? result.length : result ? 1 : 0 
      });
      return result;
    },
    
    membership: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getMembershipById(id),
    membershipsByOrg: (_: unknown, { orgId }: { orgId: string }, { dl }: Context) => dl.getMembershipsByOrg(orgId),
    membershipsByUser: (_: unknown, { userId }: { userId: string }, { dl }: Context) => dl.getMembershipsByUser(userId),
  },
  
  // Резолверы для связей между типами
  User: {
    memberships: async (parent: any, _: unknown, { dl }: Context) => {
      if (parent.memberships) {
        return parent.memberships;
      }
      return dl.getMembershipsByUser(parent.id);
    },
  },
  
  Organization: {
    members: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getMembershipsByOrg(parent.id);
    },
  },
  
  Membership: {
    user: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getUserById(parent.userId);
    },
    organization: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getOrganizationById(parent.orgId);
    },
  },
  Mutation: {
    createUser: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.createUser(input),
    updateUser: (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => dl.updateUser(id, input),
    
    // Аутентификация
    async register(_: unknown, { input }: { input: any }, { dl }: Context) {
      try {
        logger.info('Starting user registration', { email: input.email });
        
        // Проверяем, что пользователь не существует
        const existingUser = await dl.getUserByEmail(input.email);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
        
        // Хэшируем пароль
        const hashedPassword = await bcrypt.hash(input.password, 12);
        
        // Создаем пользователя
        const user = await dl.createUser({
          email: input.email,
          name: input.name,
          password: hashedPassword
        });
        
        // Генерируем токены
        const { accessToken, refreshToken } = generateTokens(user);
        
        logger.info('User registration successful', { userId: user.id, email: user.email });
        
        return {
          user,
          accessToken,
          refreshToken,
          expiresIn: 3600 // 1 час
        };
      } catch (error: any) {
        logger.error('User registration failed', { error: error.message, email: input.email });
        throw error;
      }
    },
    
    async login(_: unknown, { input }: { input: any }, { dl }: Context) {
      try {
        logger.info('Starting user login', { email: input.email });
        
        // Находим пользователя
        const user = await dl.getUserByEmail(input.email);
        if (!user) {
          throw new Error('Invalid credentials');
        }
      
        const hashedPassword = await bcrypt.hash(input.password, 12);
        logger.info('hashedPassword', { hashedPassword });
        logger.info('password', user );
        // Проверяем пароль
        if (!user.password) {
          throw new Error('Invalid credentials');
        }
        const isValidPassword = await bcrypt.compare(input.password, user.password);
        if (!isValidPassword) {
          throw new Error('Invalid credentials');
        }
        
        // Генерируем токены
        const { accessToken, refreshToken } = generateTokens(user);
        
        logger.info('User login successful', { userId: user.id, email: user.email });
        
        return {
          user,
          accessToken,
          refreshToken,
          expiresIn: 3600
        };
      } catch (error: any) {
        logger.error('User login failed', { error: error.message, email: input.email });
        throw error;
      }
    },
    
    async refreshToken(_: unknown, { input }: { input: any }, { dl }: Context) {
      try {
        logger.info('Starting token refresh');
        
        // Валидируем refresh токен
        const payload = jwt.verify(input.refreshToken, JWT_REFRESH_SECRET) as any;
        
        // Находим пользователя
        const user = await dl.getUserById(payload.userId);
        if (!user) {
          throw new Error('Invalid refresh token');
        }
        
        // Генерируем новые токены
        const { accessToken, refreshToken } = generateTokens(user);
        
        logger.info('Token refresh successful', { userId: user.id });
        
        return {
          user,
          accessToken,
          refreshToken,
          expiresIn: 3600
        };
      } catch (error: any) {
        logger.error('Token refresh failed', { error: error.message });
        throw error;
      }
    },
    
    async logout(_: unknown, _args: any, { dl }: Context) {
      // В простой реализации просто возвращаем true
      // В более сложной можно инвалидировать refresh токены
      logger.info('User logout');
      return true;
    },
    
    async forgotPassword(_: unknown, { email }: { email: string }, { dl }: Context) {
      try {
        logger.info('Password reset requested', { email });
        
        // Проверяем, что пользователь существует
        const user = await dl.getUserByEmail(email);
        if (!user) {
          // Не раскрываем, существует ли пользователь
          return true;
        }
        
        // TODO: Отправить email с токеном сброса пароля
        // Пока просто логируем
        logger.info('Password reset email would be sent', { userId: user.id, email });
        
        return true;
      } catch (error: any) {
        logger.error('Password reset request failed', { error: error.message, email });
        throw error;
      }
    },
    
    async resetPassword(_: unknown, { input }: { input: any }, { dl }: Context) {
      try {
        logger.info('Password reset attempt');
        
        // TODO: Валидировать токен сброса пароля
        // Пока просто возвращаем true
        logger.info('Password reset would be processed');
        
        return true;
      } catch (error: any) {
        logger.error('Password reset failed', { error: error.message });
        throw error;
      }
    },
    
    createOrganization: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.createOrganization(input),
    updateOrganization: (_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) => dl.updateOrganization(id, input),
    
    addMember: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.addMember(input),
    updateMemberRole: (_: unknown, { input }: { input: any }, { dl }: Context) => dl.updateMemberRole(input),
    removeMember: (_: unknown, { membershipId }: { membershipId: string }, { dl }: Context) => dl.removeMember(membershipId),
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};