import type { NewBooking } from '../src/models/booking.ts'
import { HttpError } from './http.ts'

// Шаг 3 · CHECK-NAME: проверка имени уже дана как образец.
// Прочитайте её вместе с преподавателем; следующую проверку сделаем по аналогии.
export function validateNewBooking(value: unknown): NewBooking {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_BODY', 'Ожидается объект с name и seats.')
  }
  const body = value as Record<string, unknown>
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    throw new HttpError(400, 'INVALID_NAME', 'Укажите непустое имя.')
  }
  const seats = body.seats
  // Шаг 3 · CHECK-SEATS: замените строку между метками проверкой числа от 1 до 5.
  // Шаг 6 · LIMIT: позже временно измените верхнюю границу на 4 и верните 5.
  // START CHECK-SEATS
  if (typeof seats !== 'number' || !Number.isInteger(seats) || seats < 1 || seats > 5) {
    throw new HttpError(400, 'INVALID_SEATS', 'Введите целое число участников от 1 до 5.')
  }
  return { name: body.name.trim(), seats }
  // END CHECK-SEATS
}

// Готовая проверка PATCH: здесь разрешено только подтверждение.
export function validateConfirmation(value: unknown) {
  if (typeof value !== 'object' || value === null ||
      (value as Record<string, unknown>).status !== 'confirmed') {
    throw new HttpError(400, 'INVALID_STATUS', 'Разрешён только status: confirmed.')
  }
}
