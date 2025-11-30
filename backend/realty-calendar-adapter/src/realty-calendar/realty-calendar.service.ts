import { createGraphQLLogger } from '@repo/shared-logger';
import { BookingsGrpcClient, InventoryGrpcClient } from '@repo/grpc-sdk';
import { InternalBookingDTO, WebhookResponse } from './dto/internal.dto.js';

const logger = createGraphQLLogger('realty-calendar-service');

export class RealtyCalendarService {
  constructor(
    private readonly bookingsClient: BookingsGrpcClient,
    private readonly inventoryClient: InventoryGrpcClient
  ) {}

  async processBooking(dto: InternalBookingDTO, orgId: string): Promise<WebhookResponse> {
    try {
      switch (dto.action) {
        case 'CREATE':
        case 'UPDATE':
          return await this.upsertBooking(dto, orgId);
        case 'CANCEL':
          return await this.cancelBooking(dto);
        case 'DELETE':
          return await this.deleteBooking(dto);
        default:
          return {
            ok: false,
            outcome: 'ERROR',
            reason: `Unknown action: ${dto.action}`,
          };
      }
    } catch (error: any) {
      logger.error('Failed to process booking', { error: error.message, dto });
      return {
        ok: false,
        outcome: 'ERROR',
        reason: error.message,
      };
    }
  }

  private async upsertBooking(dto: InternalBookingDTO, defaultOrgId: string): Promise<WebhookResponse> {
    // 1. Найти или создать Property/Unit (orgId будет взят из найденного объекта или использован default)
    const { propertyId, unitId, orgId } = await this.findOrCreatePropertyAndUnit(dto, defaultOrgId);

    // 2. Проверить существующую бронь по externalRef
    let existingBooking = null;
    try {
      const existing = await this.bookingsClient.getBookingByExternalRef({
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
      });
      if (existing.success && existing.booking) {
        existingBooking = existing.booking;
      }
    } catch (error) {
      // Бронь не найдена - это нормально для CREATE
      logger.debug('No existing booking found by externalRef', { externalRef: dto.externalRef });
    }

    // 3. Проверить доступность (если это новая бронь или даты изменились)
    if (!existingBooking || 
        existingBooking.checkIn?.getTime() !== dto.checkIn.getTime() ||
        existingBooking.checkOut?.getTime() !== dto.checkOut.getTime()) {
      // TODO: Добавить метод checkAvailability в bookings gRPC, если его нет
      // Пока пропускаем проверку или делаем через поиск всех броней юнита
    }

    // 4. Создать или обновить бронь
    if (existingBooking) {
      // UPDATE
      const updated = await this.bookingsClient.updateBooking({
        id: existingBooking.id,
        guestName: dto.guest.name,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guestsCount: 1, // TODO: извлечь из webhook если есть
      });

      if (!updated.booking) {
        throw new Error('Failed to update booking: booking is undefined');
      }

      return {
        ok: true,
        outcome: 'UPDATED',
        bookingId: updated.booking.id,
        unitId,
        propertyId,
      };
    } else {
      // CREATE
      const created = await this.bookingsClient.createBooking({
        orgId,
        unitId,
        propertyId,
        guestId: `guest_${dto.externalRef.id}`, // Временный ID, можно улучшить
        guestName: dto.guest.name,
        guestEmail: dto.guest.email, // Передаем email для создания гостя
        guestPhone: dto.guest.phone, // Передаем phone для создания гостя
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guestsCount: 1,
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
      } as any); // Используем as any, так как эти поля могут быть не в proto

      if (!created.booking) {
        throw new Error('Failed to create booking: booking is undefined');
      }

      return {
        ok: true,
        outcome: 'CREATED',
        bookingId: created.booking.id,
        unitId,
        propertyId,
      };
    }
  }

  private async findOrCreatePropertyAndUnit(
    dto: InternalBookingDTO,
    defaultOrgId: string
  ): Promise<{ propertyId: string; unitId: string; orgId: string }> {
    let foundOrgId: string | null = null;

    // 1. Попробовать найти по externalRef (без orgId - поиск по всем организациям)
    if (dto.propertyExternalRef && dto.unitExternalRef) {
      try {
        const property = await this.inventoryClient.getPropertyByExternalRef({
          externalSource: dto.propertyExternalRef.source,
          externalId: dto.propertyExternalRef.id,
          // orgId не передаем - ищем по всем организациям
        } as any);
        
        if (property.success && property.property) {
          foundOrgId = property.property.orgId;
          const unit = await this.inventoryClient.getUnitByExternalRef({
            externalSource: dto.unitExternalRef.source,
            externalId: dto.unitExternalRef.id,
            propertyId: property.property.id,
          });
          
          if (unit.success && unit.unit) {
            return {
              propertyId: property.property.id,
              unitId: unit.unit.id,
              orgId: foundOrgId,
            };
          }
        }
      } catch (error) {
        logger.debug('Property/Unit not found by externalRef, will search by address', { error });
      }
    }

    // 2. Попробовать найти по адресу (без orgId - поиск по всем организациям)
    try {
      const properties = await this.inventoryClient.searchPropertyByAddress({
        address: dto.address,
        // orgId не передаем - ищем по всем организациям
      } as any);
      
      if (properties.success && properties.properties && properties.properties.length > 0) {
        const property = properties.properties[0];
        foundOrgId = property.orgId;
        const units = await this.inventoryClient.getUnitsByProperty({
          propertyId: property.id,
        });
        
        if (units.success && units.units && units.units.length > 0) {
          return {
            propertyId: property.id,
            unitId: units.units[0].id,
            orgId: foundOrgId,
          };
        }
      }
    } catch (error) {
      logger.debug('Property not found by address, will create new', { error });
    }

    // 3. Создать новое Property и Unit (используем найденный orgId или default)
    const orgIdToUse = foundOrgId || defaultOrgId;
    
    // Проверяем, что orgId не равен 'default-org' (которого нет в базе)
    if (orgIdToUse === 'default-org') {
      logger.warn('Attempted to use default-org which does not exist, falling back to petroga');
      const fallbackOrgId = 'petroga';
      logger.info('Creating new Property and Unit with fallback orgId', {
        foundOrgId,
        defaultOrgId,
        orgIdToUse: fallbackOrgId,
        address: dto.address,
      });
      
      const property = await this.inventoryClient.createProperty({
        orgId: fallbackOrgId,
        title: dto.address,
        address: dto.address,
        amenities: [],
        externalSource: dto.propertyExternalRef?.source,
        externalId: dto.propertyExternalRef?.id,
      });

      if (!property.success || !property.property) {
        throw new Error('Failed to create property');
      }

      const unit = await this.inventoryClient.createUnit({
        propertyId: property.property.id,
        name: 'Unit 1', // TODO: можно улучшить
        capacity: 2,
        beds: 1,
        bathrooms: 1,
        amenities: [],
        externalSource: dto.unitExternalRef?.source,
        externalId: dto.unitExternalRef?.id,
      });

      if (!unit.success || !unit.unit) {
        throw new Error('Failed to create unit');
      }

      return {
        propertyId: property.property.id,
        unitId: unit.unit.id,
        orgId: fallbackOrgId,
      };
    }
    
    logger.info('Creating new Property and Unit', {
      foundOrgId,
      defaultOrgId,
      orgIdToUse,
      address: dto.address,
    });
    
    const property = await this.inventoryClient.createProperty({
      orgId: orgIdToUse,
      title: dto.address,
      address: dto.address,
      amenities: [],
      externalSource: dto.propertyExternalRef?.source,
      externalId: dto.propertyExternalRef?.id,
    });

    if (!property.success || !property.property) {
      throw new Error('Failed to create property');
    }

    const unit = await this.inventoryClient.createUnit({
      propertyId: property.property.id,
      name: 'Unit 1', // TODO: можно улучшить
      capacity: 2,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      externalSource: dto.unitExternalRef?.source,
      externalId: dto.unitExternalRef?.id,
    });

    if (!unit.success || !unit.unit) {
      throw new Error('Failed to create unit');
    }

    return {
      propertyId: property.property.id,
      unitId: unit.unit.id,
      orgId: orgIdToUse,
    };
  }

  private async cancelBooking(dto: InternalBookingDTO): Promise<WebhookResponse> {
    try {
      const booking = await this.bookingsClient.getBookingByExternalRef({
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
      });

      if (!booking.success || !booking.booking) {
        return {
          ok: true,
          outcome: 'IGNORED',
          reason: 'Booking not found',
        };
      }

      await this.bookingsClient.cancelBooking({
        id: booking.booking.id,
        reason: 'Cancelled via RealtyCalendar webhook',
      });

      return {
        ok: true,
        outcome: 'CANCELED',
        bookingId: booking.booking.id,
      };
    } catch (error: any) {
      logger.error('Failed to cancel booking', { error: error.message });
      return {
        ok: false,
        outcome: 'ERROR',
        reason: error.message,
      };
    }
  }

  private async deleteBooking(dto: InternalBookingDTO): Promise<WebhookResponse> {
    // Аналогично cancel, но если есть метод deleteBooking
    return this.cancelBooking(dto); // Пока используем cancel
  }
}

