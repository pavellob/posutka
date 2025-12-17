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
          return await this.createBooking(dto, orgId);
        case 'UPDATE':
          return await this.updateBooking(dto, orgId);
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

  private async createBooking(dto: InternalBookingDTO, defaultOrgId: string): Promise<WebhookResponse> {
    // 1. Найти или создать Property/Unit (orgId будет взят из найденного объекта или использован default)
    const { propertyId, unitId, orgId } = await this.findOrCreatePropertyAndUnit(dto, defaultOrgId);

    // 1.1. Получаем Property для использования дефолтных времен заезда/выезда
    let property: any = null;
    try {
      const propertyResponse = await this.inventoryClient.getProperty({ id: propertyId });
      if (propertyResponse.success && propertyResponse.property) {
        property = propertyResponse.property;
      }
    } catch (error) {
      logger.warn('Failed to get property for default times', { propertyId, error });
    }

    // 1.2. Определяем время заезда и выезда с учетом дефолтов объекта
    const { arrivalTime, departureTime, checkIn, checkOut } = this.calculateCheckInOutTimes(
      dto,
      property
    );

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

    // 3. Если бронирование уже существует - обновляем его (меняем даты и другие данные)
    // Важно: externalId остается привязанным к тому же bookingId, 
    // поэтому при отмене можно будет найти это бронирование по externalId
    if (existingBooking) {
      logger.info('Booking already exists with this externalId, updating dates and other data', {
        bookingId: existingBooking.id,
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
        oldCheckIn: existingBooking.checkIn instanceof Date 
          ? existingBooking.checkIn.toISOString() 
          : existingBooking.checkIn,
        oldCheckOut: existingBooking.checkOut instanceof Date 
          ? existingBooking.checkOut.toISOString() 
          : existingBooking.checkOut,
        newCheckIn: dto.checkIn instanceof Date ? dto.checkIn.toISOString() : dto.checkIn,
        newCheckOut: dto.checkOut instanceof Date ? dto.checkOut.toISOString() : dto.checkOut,
      });
      
      // Преобразуем финансовые данные в формат gRPC (в копейках)
      const currency = 'RUB';
      const basePriceAmount = dto.totalAmount ?? dto.amount ?? 0;
      
      const updated = await this.bookingsClient.updateBooking({
        id: existingBooking.id,
        guestName: dto.guest.name,
        guestEmail: dto.guest.email,
        guestPhone: dto.guest.phone,
        checkIn: checkIn instanceof Date ? checkIn : new Date(checkIn),
        checkOut: checkOut instanceof Date ? checkOut : new Date(checkOut),
        arrivalTime: arrivalTime,
        departureTime: departureTime,
        guestsCount: dto.guestsCount || 1,
        notes: dto.notes ?? dto.address,
        source: dto.source,
        // Финансовые поля в формате gRPC (в копейках)
        basePriceAmount: basePriceAmount,
        basePriceCurrency: currency,
        pricePerDayAmount: dto.pricePerDay,
        pricePerDayCurrency: currency,
        platformTaxAmount: dto.platformTax,
        platformTaxCurrency: currency,
        prepaymentAmount: dto.prepayment,
        prepaymentCurrency: currency,
        amountAmount: dto.amount,
        amountCurrency: currency,
        totalAmount: dto.totalAmount ?? basePriceAmount,
        totalCurrency: currency,
      } as any);

      if (!updated.booking) {
        throw new Error('Failed to update booking: booking is undefined');
      }

      logger.info('Booking updated successfully, externalId preserved for cancellation', {
        bookingId: updated.booking.id,
        externalId: dto.externalRef.id,
        externalSource: dto.externalRef.source,
      });

      // Возвращаем UPDATED с тем же bookingId
      // externalId остается привязанным к этому ID в базе данных,
      // поэтому при отмене (cancel_booking) система найдет это бронирование по externalId
      return {
        ok: true,
        outcome: 'UPDATED',
        bookingId: updated.booking.id,
        unitId,
        propertyId,
      };
    }

    // 4. Создать новое бронирование
    // Преобразуем финансовые данные в формат gRPC (в копейках)
    const currency = 'RUB'; // Валюта по умолчанию
    const basePriceAmount = dto.totalAmount ?? dto.amount ?? 0;
    
    logger.info('Creating booking via gRPC with times', {
      arrivalTime: arrivalTime,
      departureTime: departureTime,
      hasArrivalTime: !!arrivalTime,
      hasDepartureTime: !!departureTime,
    });
    
    // Подготавливаем запрос для gRPC
    // nice-grpc автоматически конвертирует camelCase в snake_case при отправке
    const grpcRequest: any = {
      orgId,
      unitId,
      propertyId,
      guestId: `guest_${dto.externalRef.id}`, // Временный ID, можно улучшить
      guestName: dto.guest.name,
      guestEmail: dto.guest.email, // Передаем email для создания гостя
      guestPhone: dto.guest.phone, // Передаем phone для создания гостя
      checkIn: checkIn instanceof Date ? checkIn : new Date(checkIn),
      checkOut: checkOut instanceof Date ? checkOut : new Date(checkOut),
      arrivalTime: arrivalTime, // nice-grpc автоматически конвертирует в arrival_time
      departureTime: departureTime, // nice-grpc автоматически конвертирует в departure_time
      guestsCount: dto.guestsCount || 1,
      notes: dto.notes ?? dto.address,
      source: dto.source,
      externalSource: dto.externalRef.source,
      externalId: dto.externalRef.id, // Сохраняем externalId для связи при отмене
      // Финансовые поля в формате gRPC (в копейках)
      basePriceAmount: basePriceAmount,
      basePriceCurrency: currency,
      pricePerDayAmount: dto.pricePerDay,
      pricePerDayCurrency: currency,
      platformTaxAmount: dto.platformTax,
      platformTaxCurrency: currency,
      prepaymentAmount: dto.prepayment,
      prepaymentCurrency: currency,
      amountAmount: dto.amount,
      amountCurrency: currency,
      totalAmount: dto.totalAmount ?? basePriceAmount,
      totalCurrency: currency,
    };
    
    logger.info('Sending gRPC request with times', {
      arrivalTime: grpcRequest.arrivalTime,
      departureTime: grpcRequest.departureTime,
      requestKeys: Object.keys(grpcRequest),
      fullRequest: JSON.stringify(grpcRequest, null, 2),
    });
    
    const created = await this.bookingsClient.createBooking(grpcRequest);
    
    logger.info('Booking created via gRPC', {
      bookingId: created.booking?.id,
      arrivalTime: created.booking?.arrivalTime,
      departureTime: created.booking?.departureTime,
    });

    if (!created.booking) {
      throw new Error('Failed to create booking: booking is undefined');
    }

    logger.info('New booking created with external reference', {
      bookingId: created.booking.id,
      externalSource: dto.externalRef.source,
      externalId: dto.externalRef.id,
    });

    return {
      ok: true,
      outcome: 'CREATED',
      bookingId: created.booking.id,
      unitId,
      propertyId,
    };
  }

  private async updateBooking(dto: InternalBookingDTO, defaultOrgId: string): Promise<WebhookResponse> {
    // 1. Найти или создать Property/Unit (orgId будет взят из найденного объекта или использован default)
    const { propertyId, unitId, orgId } = await this.findOrCreatePropertyAndUnit(dto, defaultOrgId);

    // 1.1. Получаем Property для использования дефолтных времен заезда/выезда
    let property: any = null;
    try {
      const propertyResponse = await this.inventoryClient.getProperty({ id: propertyId });
      if (propertyResponse.success && propertyResponse.property) {
        property = propertyResponse.property;
      }
    } catch (error) {
      logger.warn('Failed to get property for default times', { propertyId, error });
    }

    // 1.2. Определяем время заезда и выезда с учетом дефолтов объекта
    const { arrivalTime, departureTime, checkIn, checkOut } = this.calculateCheckInOutTimes(
      dto,
      property
    );

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
      // Бронь не найдена - для UPDATE создадим новую (upsert поведение)
      logger.info('No existing booking found for UPDATE, will create new one', { externalRef: dto.externalRef });
    }

    // 3. Если бронирование существует - обновляем, иначе создаем
    if (existingBooking) {
      // UPDATE существующего
      // Преобразуем финансовые данные в формат gRPC (в копейках)
      const currency = 'RUB';
      const basePriceAmount = dto.totalAmount ?? dto.amount ?? 0;
      
      const updated = await this.bookingsClient.updateBooking({
        id: existingBooking.id,
        guestName: dto.guest.name,
        guestEmail: dto.guest.email,
        guestPhone: dto.guest.phone,
        checkIn: checkIn instanceof Date ? checkIn : new Date(checkIn),
        checkOut: checkOut instanceof Date ? checkOut : new Date(checkOut),
        arrivalTime: arrivalTime,
        departureTime: departureTime,
        guestsCount: dto.guestsCount || 1,
        notes: dto.notes ?? dto.address,
        source: dto.source,
        // Финансовые поля в формате gRPC (в копейках)
        basePriceAmount: basePriceAmount,
        basePriceCurrency: currency,
        pricePerDayAmount: dto.pricePerDay,
        pricePerDayCurrency: currency,
        platformTaxAmount: dto.platformTax,
        platformTaxCurrency: currency,
        prepaymentAmount: dto.prepayment,
        prepaymentCurrency: currency,
        amountAmount: dto.amount,
        amountCurrency: currency,
        totalAmount: dto.totalAmount ?? basePriceAmount,
        totalCurrency: currency,
      } as any);

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
      // CREATE нового (upsert поведение для UPDATE)
      logger.info('Creating new booking for UPDATE action (upsert behavior)', {
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
      });
      
      // Преобразуем финансовые данные в формат gRPC (в копейках)
      const currency = 'RUB';
      const basePriceAmount = dto.totalAmount ?? dto.amount ?? 0;
      
      const created = await this.bookingsClient.createBooking({
        orgId,
        unitId,
        propertyId,
        guestId: `guest_${dto.externalRef.id}`,
        guestName: dto.guest.name,
        guestEmail: dto.guest.email,
        guestPhone: dto.guest.phone,
        checkIn: checkIn instanceof Date ? checkIn : new Date(checkIn),
        checkOut: checkOut instanceof Date ? checkOut : new Date(checkOut),
        arrivalTime: arrivalTime,
        departureTime: departureTime,
        guestsCount: dto.guestsCount || 1,
        notes: dto.notes ?? dto.address,
        source: dto.source,
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
        // Финансовые поля в формате gRPC (в копейках)
        basePriceAmount: basePriceAmount,
        basePriceCurrency: currency,
        pricePerDayAmount: dto.pricePerDay,
        pricePerDayCurrency: currency,
        platformTaxAmount: dto.platformTax,
        platformTaxCurrency: currency,
        prepaymentAmount: dto.prepayment,
        prepaymentCurrency: currency,
        amountAmount: dto.amount,
        amountCurrency: currency,
        totalAmount: dto.totalAmount ?? basePriceAmount,
        totalCurrency: currency,
      } as any);

      if (!created.booking) {
        throw new Error('Failed to create booking: booking is undefined');
      }

      logger.info('New booking created with external reference for cancellation', {
        bookingId: created.booking.id,
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
      });

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
    // Сначала пробуем найти Property по realty_id
    if (dto.propertyExternalRef) {
      try {
        logger.info('Searching for Property by externalRef', {
          source: dto.propertyExternalRef.source,
          id: dto.propertyExternalRef.id,
        });
        
        const property = await this.inventoryClient.getPropertyByExternalRef({
          externalSource: dto.propertyExternalRef.source,
          externalId: dto.propertyExternalRef.id,
          // orgId не передаем - ищем по всем организациям
        } as any);
        
        if (property.success && property.property) {
          foundOrgId = property.property.orgId;
          logger.info('Property found by externalRef', {
            propertyId: property.property.id,
            orgId: foundOrgId,
            hasUnitExternalRef: !!dto.unitExternalRef,
          });
          
          // Если есть unitExternalRef, пытаемся найти Unit
          if (dto.unitExternalRef) {
            const unit = await this.inventoryClient.getUnitByExternalRef({
              externalSource: dto.unitExternalRef.source,
              externalId: dto.unitExternalRef.id,
              propertyId: property.property.id,
            });
            
            if (unit.success && unit.unit) {
              logger.info('Unit found by externalRef', {
                unitId: unit.unit.id,
                propertyId: property.property.id,
              });
              return {
                propertyId: property.property.id,
                unitId: unit.unit.id,
                orgId: foundOrgId,
              };
            } else {
              logger.info('Unit not found by externalRef, checking existing units or creating new', {
                propertyId: property.property.id,
                unitExternalRef: dto.unitExternalRef,
              });
              
              // Проверяем, есть ли уже Unit с таким externalId на другом Property
              // (защита от дублирования)
              // Примечание: getUnitByExternalRef требует propertyId, поэтому мы не можем искать везде
              // Это ограничение API - если Unit не найден по externalId в этом Property,
              // мы просто создаем новый. Дубликаты будут предотвращены на уровне базы данных
              // через уникальный индекс на (propertyId, externalSource, externalId)
              // или (externalSource, externalId) если такой есть
              
              // Проверяем существующие Units в этом Property
              const units = await this.inventoryClient.getUnitsByProperty({
                propertyId: property.property.id,
              });
              
              // Если есть Units, проверяем, нет ли среди них Unit с таким же externalId
              if (units.success && units.units && units.units.length > 0) {
                // Если есть unitExternalRef, проверяем, нет ли Unit с таким же externalId
                if (dto.unitExternalRef) {
                  // Ищем Unit с таким же externalId (не создаем дубликат)
                  const unitWithSameExternalId = units.units.find(
                    (u: any) => u.externalSource === dto.unitExternalRef?.source && 
                                u.externalId === dto.unitExternalRef?.id
                  );
                  
                  if (unitWithSameExternalId) {
                    logger.info('Found existing Unit with same externalId, using it to avoid duplicate', {
                      unitId: unitWithSameExternalId.id,
                      externalId: dto.unitExternalRef.id,
                    });
                    return {
                      propertyId: property.property.id,
                      unitId: unitWithSameExternalId.id,
                      orgId: foundOrgId,
                    };
                  }
                  
                  // Ищем Unit без externalId (можно использовать, чтобы не создавать дубликат)
                  const unitWithoutExternalId = units.units.find((u: any) => !u.externalSource || !u.externalId);
                  
                  if (unitWithoutExternalId) {
                    logger.info('Using existing unit without externalId (to avoid creating duplicate)', {
                      unitId: unitWithoutExternalId.id,
                    });
                    // TODO: Здесь нужно обновить Unit, добавив externalId (если метод updateUnit поддерживает это)
                    // Пока используем существующий Unit
                    return {
                      propertyId: property.property.id,
                      unitId: unitWithoutExternalId.id,
                      orgId: foundOrgId,
                    };
                  }
                }
                
                // Если нет подходящего Unit (все имеют другие externalId), создаем новый
                logger.info('All existing units have different externalId, creating new Unit', {
                  propertyId: property.property.id,
                  existingUnitsCount: units.units.length,
                });
              }
              
              // Создаем новый Unit для найденного Property
              logger.info('Creating new Unit for found Property', {
                propertyId: property.property.id,
                unitExternalRef: dto.unitExternalRef,
              });
              
              const newUnit = await this.inventoryClient.createUnit({
                propertyId: property.property.id,
                name: 'Unit 1',
                capacity: 2,
                beds: 1,
                bathrooms: 1,
                amenities: [],
                images: [],
                externalSource: dto.unitExternalRef?.source,
                externalId: dto.unitExternalRef?.id,
              });
              
              if (!newUnit.success || !newUnit.unit) {
                throw new Error('Failed to create unit for found property');
              }
              
              return {
                propertyId: property.property.id,
                unitId: newUnit.unit.id,
                orgId: foundOrgId,
              };
            }
          } else {
            // Если нет unitExternalRef, но Property найден - используем первый Unit или создадим новый
            logger.info('No unitExternalRef provided, will use first unit or create new', {
              propertyId: property.property.id,
            });
            const units = await this.inventoryClient.getUnitsByProperty({
              propertyId: property.property.id,
            });
            
            if (units.success && units.units && units.units.length > 0) {
              logger.info('Using first unit from property', {
                unitId: units.units[0].id,
              });
              return {
                propertyId: property.property.id,
                unitId: units.units[0].id,
                orgId: foundOrgId,
              };
            }
            
            // Если Units нет, создаем новый Unit для найденного Property
            logger.info('Creating new Unit for found Property (no externalRef)', {
              propertyId: property.property.id,
            });
            
            const newUnit = await this.inventoryClient.createUnit({
              propertyId: property.property.id,
              name: 'Unit 1',
              capacity: 2,
              beds: 1,
              bathrooms: 1,
              amenities: [],
              images: [],
            });
            
            if (!newUnit.success || !newUnit.unit) {
              throw new Error('Failed to create unit for found property');
            }
            
            return {
              propertyId: property.property.id,
              unitId: newUnit.unit.id,
              orgId: foundOrgId,
            };
          }
        }
      } catch (error: any) {
        logger.debug('Property/Unit not found by externalRef, will search by address', {
          error: error?.message,
          propertyExternalRef: dto.propertyExternalRef,
        });
      }
    }

    // 2. Попробовать найти по адресу ТОЛЬКО если нет externalRef
    // Это нужно, чтобы избежать дублирования объектов, у которых есть externalId
    if (!dto.propertyExternalRef) {
      try {
        logger.info('Searching for Property by address (no externalRef provided)', {
          address: dto.address,
        });
        
        const properties = await this.inventoryClient.searchPropertyByAddress({
          address: dto.address,
          // orgId не передаем - ищем по всем организациям
        } as any);
        
        if (properties.success && properties.properties && properties.properties.length > 0) {
          const property = properties.properties[0];
          foundOrgId = property.orgId;
          
          // Проверяем, что у найденного Property нет другого externalId (чтобы избежать конфликтов)
          if (property.externalSource && property.externalId) {
            logger.warn('Found property by address but it already has externalRef, skipping to avoid duplicates', {
              propertyId: property.id,
              existingExternalSource: property.externalSource,
              existingExternalId: property.externalId,
              requestedAddress: dto.address,
            });
            // Не используем этот объект, чтобы не создавать конфликты
          } else {
            // У найденного Property нет externalRef, можем использовать
            const units = await this.inventoryClient.getUnitsByProperty({
              propertyId: property.id,
            });
            
            if (units.success && units.units && units.units.length > 0) {
              logger.info('Using property found by address (no externalRef conflict)', {
                propertyId: property.id,
              });
              return {
                propertyId: property.id,
                unitId: units.units[0].id,
                orgId: foundOrgId,
              };
            }
          }
        }
      } catch (error) {
        logger.debug('Property not found by address, will create new', { error });
      }
    } else {
      logger.debug('Skipping address search because externalRef is provided', {
        propertyExternalRef: dto.propertyExternalRef,
      });
    }

    // 3. Финальная проверка: перед созданием нового Property проверяем еще раз externalRef
    // (на случай, если он появился между проверками)
    if (dto.propertyExternalRef) {
      try {
        logger.debug('Final check: searching for Property by externalRef before creating new', {
          source: dto.propertyExternalRef.source,
          id: dto.propertyExternalRef.id,
        });
        
        const finalPropertyCheck = await this.inventoryClient.getPropertyByExternalRef({
          externalSource: dto.propertyExternalRef.source,
          externalId: dto.propertyExternalRef.id,
        } as any);
        
        if (finalPropertyCheck.success && finalPropertyCheck.property) {
          logger.info('Property found in final check (race condition prevented)', {
            propertyId: finalPropertyCheck.property.id,
            orgId: finalPropertyCheck.property.orgId,
          });
          
          // Повторяем логику поиска Unit
          if (dto.unitExternalRef) {
            const finalUnitCheck = await this.inventoryClient.getUnitByExternalRef({
              externalSource: dto.unitExternalRef.source,
              externalId: dto.unitExternalRef.id,
              propertyId: finalPropertyCheck.property.id,
            });
            
            if (finalUnitCheck.success && finalUnitCheck.unit) {
              return {
                propertyId: finalPropertyCheck.property.id,
                unitId: finalUnitCheck.unit.id,
                orgId: finalPropertyCheck.property.orgId,
              };
            }
          }
          
          // Unit не найден, используем первый или создаем новый
          const units = await this.inventoryClient.getUnitsByProperty({
            propertyId: finalPropertyCheck.property.id,
          });
          
          if (units.success && units.units && units.units.length > 0) {
            return {
              propertyId: finalPropertyCheck.property.id,
              unitId: units.units[0].id,
              orgId: finalPropertyCheck.property.orgId,
            };
          }
          
          // Создаем Unit для найденного Property
          const newUnit = await this.inventoryClient.createUnit({
            propertyId: finalPropertyCheck.property.id,
            name: 'Unit 1',
            capacity: 2,
            beds: 1,
            bathrooms: 1,
            amenities: [],
            images: [],
            externalSource: dto.unitExternalRef?.source,
            externalId: dto.unitExternalRef?.id,
          });
          
          if (newUnit.success && newUnit.unit) {
            return {
              propertyId: finalPropertyCheck.property.id,
              unitId: newUnit.unit.id,
              orgId: finalPropertyCheck.property.orgId,
            };
          }
        }
      } catch (error: any) {
        logger.debug('Final check failed, proceeding with creation', {
          error: error?.message,
        });
      }
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
        images: [],
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
      images: [],
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
      logger.info('Cancelling booking', {
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
        cancellationReason: dto.cancellationReason,
        canceledDate: dto.canceledDate,
      });

      const booking = await this.bookingsClient.getBookingByExternalRef({
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
      });

      if (!booking.success || !booking.booking) {
        logger.info('Booking not found for cancellation, ignoring', {
          externalSource: dto.externalRef.source,
          externalId: dto.externalRef.id,
        });
        return {
          ok: true,
          outcome: 'IGNORED',
          reason: 'Booking not found',
        };
      }

      // Используем причину отмены из webhook, если есть, иначе стандартное сообщение
      const cancellationReason = dto.cancellationReason || 'Отменено через RealtyCalendar webhook';

      logger.info('Cancelling booking via gRPC', {
        bookingId: booking.booking.id,
        cancellationReason,
      });

      const canceled = await this.bookingsClient.cancelBooking({
        id: booking.booking.id,
        reason: cancellationReason,
      });

      if (!canceled.booking) {
        throw new Error('Failed to cancel booking: booking is undefined in response');
      }

      logger.info('Booking cancelled successfully', {
        bookingId: canceled.booking.id,
        cancellationReason: canceled.booking.cancellationReason,
      });

      return {
        ok: true,
        outcome: 'CANCELED',
        bookingId: canceled.booking.id,
        reason: cancellationReason,
      };
    } catch (error: any) {
      logger.error('Failed to cancel booking', {
        error: error.message,
        externalSource: dto.externalRef.source,
        externalId: dto.externalRef.id,
      });
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

  /**
   * Вычисляет время заезда и выезда с учетом дефолтных значений из Property
   */
  private calculateCheckInOutTimes(
    dto: InternalBookingDTO,
    property: any
  ): { arrivalTime?: string; departureTime?: string; checkIn: Date; checkOut: Date } {
    // Дефолтные значения из Property (или стандартные 14:00 и 12:00)
    const defaultCheckInTime = property?.defaultCheckInTime || '14:00';
    const defaultCheckOutTime = property?.defaultCheckOutTime || '12:00';

    // Определяем даты заезда и выезда
    const checkInDate = dto.checkIn instanceof Date ? dto.checkIn : new Date(dto.checkIn);
    const checkOutDate = dto.checkOut instanceof Date ? dto.checkOut : new Date(dto.checkOut);

    // Время заезда
    let arrivalTime: string | undefined = dto.arrivalTime;
    if (!arrivalTime) {
      // Если время заезда не указано, используем дефолтное время заезда объекта
      // Но если бронь сегодня и уже после дефолтного времени заезда, используем текущее время + 1 час
      const now = new Date();
      const isToday = checkInDate.toDateString() === now.toDateString();
      const [defaultHour, defaultMinute] = defaultCheckInTime.split(':').map(Number);
      const defaultTime = new Date(checkInDate);
      defaultTime.setHours(defaultHour, defaultMinute, 0, 0);

      if (isToday && now >= defaultTime) {
        // Бронь сегодня и уже после дефолтного времени - используем текущее время + 1 час
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        arrivalTime = `${String(oneHourLater.getHours()).padStart(2, '0')}:${String(oneHourLater.getMinutes()).padStart(2, '0')}`;
        logger.info('Using current time + 1 hour for arrival time', { arrivalTime, isToday, now: now.toISOString() });
      } else {
        // Используем дефолтное время заезда объекта
        arrivalTime = defaultCheckInTime;
        logger.info('Using default check-in time from property', { arrivalTime, defaultCheckInTime });
      }
    }

    // Время выезда
    let departureTime: string | undefined = dto.departureTime;
    if (!departureTime) {
      // Если время выезда не указано, используем дефолтное время выезда объекта
      departureTime = defaultCheckOutTime;
      logger.info('Using default check-out time from property', { departureTime, defaultCheckOutTime });
    }

    // Обновляем даты checkIn и checkOut с учетом времени заезда/выезда
    const finalCheckIn = new Date(checkInDate);
    if (arrivalTime) {
      const [hours, minutes] = arrivalTime.split(':').map(Number);
      finalCheckIn.setHours(hours || 0, minutes || 0, 0, 0);
    }

    const finalCheckOut = new Date(checkOutDate);
    if (departureTime) {
      const [hours, minutes] = departureTime.split(':').map(Number);
      finalCheckOut.setHours(hours || 0, minutes || 0, 0, 0);
    }

    return {
      arrivalTime,
      departureTime,
      checkIn: finalCheckIn,
      checkOut: finalCheckOut,
    };
  }
}

