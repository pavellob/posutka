/**
 * Находит ближайшие бронирования для уборки
 * @param bookings - массив бронирований
 * @param scheduledAt - дата и время уборки
 * @returns объект с информацией о заезде и выезде
 */
export function findAdjacentBookings(bookings: any[], scheduledAt: string | Date) {
  const cleaningDate = new Date(scheduledAt)
  cleaningDate.setHours(0, 0, 0, 0) // Нормализуем до начала дня

  // Фильтруем только подтвержденные бронирования
  const confirmedBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'PENDING'
  )

  // Находим бронь с выездом <= scheduledAt (последний выезд до или в день уборки)
  // Ищем выезд который происходит до или в день уборки (самый поздний)
  const checkoutBookingCandidates = confirmedBookings
    .filter((b) => {
      const checkoutDate = new Date(b.checkOut)
      checkoutDate.setHours(0, 0, 0, 0)
      // Ищем выезд который происходит до или в день уборки
      return checkoutDate <= cleaningDate
    })
  
  const checkoutBooking = checkoutBookingCandidates.length > 0
    ? checkoutBookingCandidates.sort((a, b) => {
        // Сортируем по дате выезда по убыванию, берем самый поздний (ближайший к дате уборки)
        return new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime()
      })[0]
    : null

  // Находим бронь с заездом >= scheduledAt (первый заезд после или в день уборки)
  const checkinBooking = confirmedBookings
    .filter((b) => {
      const checkinDate = new Date(b.checkIn)
      checkinDate.setHours(0, 0, 0, 0)
      return checkinDate >= cleaningDate
    })
    .sort((a, b) => {
      // Сортируем по дате заезда по возрастанию, берем первый
      return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
    })[0]

  return {
    checkoutBooking,
    checkinBooking,
  }
}

/**
 * Форматирует информацию о заезде/выезде для отображения
 */
export function formatCheckInOutInfo(
  checkoutBooking: any,
  checkinBooking: any
): { checkoutText?: string; checkinText?: string } {
  const result: { checkoutText?: string; checkinText?: string } = {}

  if (checkoutBooking && checkoutBooking.checkOut) {
    try {
      const checkoutDate = new Date(checkoutBooking.checkOut)
      if (!isNaN(checkoutDate.getTime())) {
        const checkoutDateStr = checkoutDate.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
        })

        // Используем departureTime если есть, иначе время из checkOut
        let checkoutTime = checkoutBooking.departureTime || checkoutDate.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })
        // Если departureTime не в формате HH:mm, нормализуем его
        if (checkoutTime && !checkoutTime.match(/^\d{1,2}:\d{2}$/)) {
          checkoutTime = checkoutDate.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })
        }

        if (checkoutDateStr && checkoutTime) {
          result.checkoutText = `Выезд ${checkoutDateStr} в ${checkoutTime}`
        }
      }
    } catch (error) {
      console.error('Error formatting checkout info:', error)
    }
  }

  if (checkinBooking && checkinBooking.checkIn) {
    try {
      const checkinDate = new Date(checkinBooking.checkIn)
      if (!isNaN(checkinDate.getTime())) {
        const checkinDateStr = checkinDate.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
        })

        // Используем arrivalTime если есть, иначе время из checkIn
        let checkinTime = checkinBooking.arrivalTime || checkinDate.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })
        // Если arrivalTime не в формате HH:mm, нормализуем его
        if (checkinTime && !checkinTime.match(/^\d{1,2}:\d{2}$/)) {
          checkinTime = checkinDate.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })
        }

        if (checkinDateStr && checkinTime) {
          result.checkinText = `Заезд ${checkinDateStr} в ${checkinTime}`
        }
      }
    } catch (error) {
      console.error('Error formatting checkin info:', error)
    }
  }

  return result
}
