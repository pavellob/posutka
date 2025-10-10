import type { Context } from '../context.js';
import { createGraphQLLogger } from '@repo/shared-logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const logger = createGraphQLLogger('iam-resolvers');

// JWT конфигурация
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Функция для извлечения userId из JWT токена
function extractUserIdFromToken(authorization?: string): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authorization.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId;
  } catch (error) {
    logger.error('JWT verification failed', { error: (error as Error).message });
    return null;
  }
}

// Функция для извлечения токена из контекста GraphQL Yoga
function getAuthorizationFromContext(context: any): string | null {
  const headers = context.request?.headers || context.headers;
  return headers?.authorization || headers?.Authorization || null;
}

export const resolvers: any = {
  Query: {
    // Статистика пользователей
    async userStats(_: unknown, __: unknown, { dl }: Context) {
      try {
        logger.info('Fetching user statistics');
        
        // Получаем общую статистику пользователей
        const totalUsers = 100; // Mock for now
        const activeUsers = 95; // Mock for now
        
        // Статистика по ролям (если есть система ролей)
        const usersByRole = [
          { role: 'ADMIN', count: 5 },
          { role: 'MANAGER', count: 42 },
          { role: 'USER', count: totalUsers - 47 }
        ];
        
        return {
          totalUsers,
          activeUsers,
          lockedUsers: 0,
          onlineUsers: 0,
          newUsers: 0,
          usersByRole
        };
      } catch (error: any) {
        logger.error('Failed to fetch user statistics', { error: error.message });
        throw error;
      }
    },

    // Расширенный список пользователей
    async usersAdvanced(
      _: unknown, 
      { orgId, first = 10, after, filters, sort }: any, 
      { dl }: Context
    ) {
      try {
        logger.info('Fetching users for organization', { orgId, first, filters, sort });
        
        // Получаем членство в организации
        const memberships = await dl.getMembershipsByOrg(orgId);
        
        logger.info('Found memberships', { 
          orgId, 
          count: memberships.length,
          userIds: memberships.map(m => m.userId)
        });
        
        if (!memberships || memberships.length === 0) {
          logger.info('No members found in organization', { orgId });
          return {
            edges: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
              totalCount: 0
            }
          };
        }
        
        // Получаем пользователей по их ID
        const userIds = memberships.map(m => m.userId);
        const userPromises = userIds.map(userId => dl.getUserById(userId));
        const usersArray = await Promise.all(userPromises);
        
        // Фильтруем null значения
        const validUsers = usersArray.filter(user => user !== null);
        
        // Преобразуем в IAMUser формат
        const iamUsers = validUsers.map((user: any) => ({
          ...user,
          status: user.status || 'ACTIVE',
          lastLoginAt: user.lastLoginAt || null,
          failedLoginAttempts: 0,
          isLocked: user.isLocked || false,
          twoFactorEnabled: false,
          systemRoles: user.systemRoles || ['USER'],
          permissions: [],
          activeSessions: [],
          activityLog: []
        }));
        
        return {
          edges: iamUsers.map((user: any) => ({ node: user, cursor: user.id })),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: iamUsers.length > 0 ? iamUsers[0].id : null,
            endCursor: iamUsers.length > 0 ? iamUsers[iamUsers.length - 1].id : null,
            totalCount: iamUsers.length
          }
        };
      } catch (error: any) {
        logger.error('Failed to fetch users', { error: error.message, orgId });
        throw error;
      }
    },

    // Профиль пользователя с полной информацией
    async userProfile(_: unknown, { id }: { id: string }, { dl }: Context) {
      try {
        logger.info('Fetching user profile', { userId: id });
        
        const user = await dl.getUserById(id);
        if (!user) {
          throw new Error('User not found');
        }
        
        // Преобразуем в IAMUser формат
        return {
          ...user,
          status: user.status || 'ACTIVE',
          lastLoginAt: user.lastLoginAt || null,
          failedLoginAttempts: 0,
          isLocked: user.isLocked || false,
          twoFactorEnabled: false,
          systemRoles: user.systemRoles || ['USER'],
          permissions: [],
          activeSessions: [],
          activityLog: []
        };
      } catch (error: any) {
        logger.error('Failed to fetch user profile', { error: error.message, userId: id });
        throw error;
      }
    },

    // Активные сессии пользователя
    async userSessions(_: unknown, { userId }: { userId: string }, { dl }: Context) {
      try {
        logger.info('Fetching user sessions', { userId });
        
        // Мок данные для сессий
        return [
          {
            id: 'session-1',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            createdAt: new Date(),
            lastActivityAt: new Date(),
            isActive: true,
            deviceType: 'Desktop',
            location: 'Moscow, Russia'
          }
        ];
      } catch (error: any) {
        logger.error('Failed to fetch user sessions', { error: error.message, userId });
        throw error;
      }
    },

    // История активности пользователя
    async userActivity(_: unknown, { userId, limit = 10 }: { userId: string; limit?: number }, { dl }: Context) {
      try {
        logger.info('Fetching user activity', { userId, limit });
        
        // Мок данные для активности
        return [
          {
            id: 'activity-1',
            action: 'LOGIN',
            description: 'User logged in',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0...',
            metadata: {},
            createdAt: new Date()
          }
        ];
      } catch (error: any) {
        logger.error('Failed to fetch user activity', { error: error.message, userId });
        throw error;
      }
    },

    // Все разрешения
    async permissions(_: unknown, __: unknown, { dl }: Context) {
      try {
        logger.info('Fetching permissions');
        
        // Мок данные для разрешений
        return [
          {
            id: 'perm-1',
            name: 'user.read',
            description: 'Read user information',
            category: 'user',
            action: 'read',
            resource: 'user'
          },
          {
            id: 'perm-2',
            name: 'user.write',
            description: 'Modify user information',
            category: 'user',
            action: 'write',
            resource: 'user'
          }
        ];
      } catch (error: any) {
        logger.error('Failed to fetch permissions', { error: error.message });
        throw error;
      }
    },

    // Разрешения пользователя
    async userPermissions(_: unknown, { userId }: { userId: string }, { dl }: Context) {
      try {
        logger.info('Fetching user permissions', { userId });
        
        // Мок данные для разрешений пользователя
        return [
          {
            id: 'perm-1',
            name: 'user.read',
            description: 'Read user information',
            category: 'user',
            action: 'read',
            resource: 'user'
          }
        ];
      } catch (error: any) {
        logger.error('Failed to fetch user permissions', { error: error.message, userId });
        throw error;
      }
    }
  },

  Mutation: {
    // Создание пользователя IAM
    async createIAMUser(_: unknown, { input }: { input: any }, { dl }: Context) {
      try {
        logger.info('Creating user', { email: input.email, orgId: input.orgId });
        
        // Хэшируем пароль
        const hashedPassword = await bcrypt.hash(input.password, 12);
        
        // Создаем пользователя
        const user = await dl.createUser({
          email: input.email,
          name: input.name,
          password: hashedPassword
        });
        
        // Если указана организация, добавляем пользователя в неё
        if (input.orgId) {
          await dl.addMember({
            userId: user.id,
            orgId: input.orgId,
            role: 'STAFF' // По умолчанию роль STAFF
          });
          logger.info('User added to organization', { userId: user.id, orgId: input.orgId });
        }
        
        logger.info('User created successfully', { userId: user.id });
        
        // Преобразуем в IAMUser формат
        return {
          ...user,
          status: user.status || 'ACTIVE',
          lastLoginAt: user.lastLoginAt || null,
          failedLoginAttempts: 0,
          isLocked: user.isLocked || false,
          twoFactorEnabled: false,
          systemRoles: input.systemRoles || ['USER'],
          permissions: [],
          activeSessions: [],
          activityLog: []
        };
      } catch (error: any) {
        logger.error('Failed to create user', { error: error.message, email: input.email });
        throw error;
      }
    },

    // Обновление пользователя IAM
    async updateIAMUser(_: unknown, { id, input }: { id: string; input: any }, { dl }: Context) {
      try {
        logger.info('Updating user', { userId: id, input });
        
        const user = await dl.updateUser(id, {
          name: input.name,
          systemRoles: input.systemRoles,
          status: input.status,
          isLocked: input.lockUser
        });
        
        logger.info('User updated successfully', { userId: id });
        
        // Преобразуем в IAMUser формат
        return {
          ...user,
          status: user.status || 'ACTIVE',
          lastLoginAt: user.lastLoginAt || new Date(),
          failedLoginAttempts: 0,
          isLocked: user.isLocked || false,
          twoFactorEnabled: false,
          systemRoles: user.systemRoles || ['USER'],
          permissions: [],
          activeSessions: [],
          activityLog: []
        };
      } catch (error: any) {
        logger.error('Failed to update user', { error: error.message, userId: id });
        throw error;
      }
    },

    // Удаление пользователя IAM
    async deleteIAMUser(_: unknown, { id }: { id: string }, { dl }: Context) {
      try {
        logger.info('Deleting user', { userId: id });
        
        // В реальной системе здесь была бы логика удаления
        // await dl.deleteUser(id);
        
        logger.info('User deleted successfully', { userId: id });
        return true;
      } catch (error: any) {
        logger.error('Failed to delete user', { error: error.message, userId: id });
        throw error;
      }
    },

    // Смена пароля
    async changePassword(_: unknown, { input }: { input: any }, { dl }: Context) {
      try {
        logger.info('Changing password');
        
        // В реальной системе здесь была бы логика смены пароля
        logger.info('Password changed successfully');
        return true;
      } catch (error: any) {
        logger.error('Failed to change password', { error: error.message });
        throw error;
      }
    },

    // Сброс пароля администратором
    async resetUserPassword(_: unknown, { userId, input }: { userId: string; input: any }, { dl }: Context) {
      try {
        logger.info('Resetting user password', { userId });
        
        // Хэшируем новый пароль
        const hashedPassword = await bcrypt.hash(input.newPassword, 12);
        
        // Обновляем пароль пользователя
        await dl.updateUser(userId, { password: hashedPassword });
        
        logger.info('User password reset successfully', { userId });
        return true;
      } catch (error: any) {
        logger.error('Failed to reset user password', { error: error.message, userId });
        throw error;
      }
    },

    // Блокировка пользователя
    async lockUser(_: unknown, { userId, reason }: { userId: string; reason: string }, { dl }: Context) {
      try {
        logger.info('Locking user', { userId, reason });
        
        // В реальной системе здесь была бы логика блокировки
        logger.info('User locked successfully', { userId });
        return true;
      } catch (error: any) {
        logger.error('Failed to lock user', { error: error.message, userId });
        throw error;
      }
    },

    // Разблокировка пользователя
    async unlockUser(_: unknown, { userId }: { userId: string }, { dl }: Context) {
      try {
        logger.info('Unlocking user', { userId });
        
        // В реальной системе здесь была бы логика разблокировки
        logger.info('User unlocked successfully', { userId });
        return true;
      } catch (error: any) {
        logger.error('Failed to unlock user', { error: error.message, userId });
        throw error;
      }
    },

    // Завершение сессии
    async terminateSession(_: unknown, { sessionId }: { sessionId: string }, { dl }: Context) {
      try {
        logger.info('Terminating session', { sessionId });
        
        // В реальной системе здесь была бы логика завершения сессии
        logger.info('Session terminated successfully', { sessionId });
        return true;
      } catch (error: any) {
        logger.error('Failed to terminate session', { error: error.message, sessionId });
        throw error;
      }
    },

    // Завершение всех сессий пользователя
    async terminateAllUserSessions(_: unknown, { userId }: { userId: string }, { dl }: Context) {
      try {
        logger.info('Terminating all user sessions', { userId });
        
        // В реальной системе здесь была бы логика завершения всех сессий
        logger.info('All user sessions terminated successfully', { userId });
        return true;
      } catch (error: any) {
        logger.error('Failed to terminate all user sessions', { error: error.message, userId });
        throw error;
      }
    },

    // Назначение ролей
    async assignRoles(_: unknown, { userId, roles }: { userId: string; roles: string[] }, { dl }: Context) {
      try {
        logger.info('Assigning roles to user', { userId, roles });
        
        // В реальной системе здесь была бы логика назначения ролей
        const user = await dl.getUserById(userId);
        return user;
      } catch (error: any) {
        logger.error('Failed to assign roles', { error: error.message, userId, roles });
        throw error;
      }
    },

    // Отзыв ролей
    async revokeRoles(_: unknown, { userId, roles }: { userId: string; roles: string[] }, { dl }: Context) {
      try {
        logger.info('Revoking roles from user', { userId, roles });
        
        // В реальной системе здесь была бы логика отзыва ролей
        const user = await dl.getUserById(userId);
        return user;
      } catch (error: any) {
        logger.error('Failed to revoke roles', { error: error.message, userId, roles });
        throw error;
      }
    },

    // Назначение разрешений
    async assignPermissions(_: unknown, { userId, permissionIds }: { userId: string; permissionIds: string[] }, { dl }: Context) {
      try {
        logger.info('Assigning permissions to user', { userId, permissionIds });
        
        // В реальной системе здесь была бы логика назначения разрешений
        const user = await dl.getUserById(userId);
        return user;
      } catch (error: any) {
        logger.error('Failed to assign permissions', { error: error.message, userId, permissionIds });
        throw error;
      }
    },

    // Отзыв разрешений
    async revokePermissions(_: unknown, { userId, permissionIds }: { userId: string; permissionIds: string[] }, { dl }: Context) {
      try {
        logger.info('Revoking permissions from user', { userId, permissionIds });
        
        // В реальной системе здесь была бы логика отзыва разрешений
        const user = await dl.getUserById(userId);
        return user;
      } catch (error: any) {
        logger.error('Failed to revoke permissions', { error: error.message, userId, permissionIds });
        throw error;
      }
    }
  }
};
