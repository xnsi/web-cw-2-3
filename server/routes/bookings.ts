import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Booking } from '../../src/models/booking.ts'
import type { BookingStore } from '../storage/index.ts'
import { HttpError, readJson, sendJson } from '../http.ts'
import { validateNewBooking, validateConfirmation } from '../validation.ts'

export async function routeBookings(
  req: IncomingMessage, res: ServerResponse, pathname: string, store: BookingStore,
) {
  if (pathname === '/api/bookings') {
    if (req.method === 'GET') {
      // Шаг 1 · API-GET: замените заглушку получением списка и ответом 200.
      // START API-GET
      const bookings = await store.list()
      sendJson(res, 200, { data: bookings })
      return
      // END API-GET
    }
    if (req.method === 'POST') {
      // Шаг 4 · API-POST: тело → проверка → серверные поля → запись → ответ 201.
      // START API-POST
      const input = validateNewBooking(await readJson(req))
      const booking: Booking = {
        id: randomUUID(), name: input.name, seats: input.seats,
        status: 'new', source: 'web',
      }
      const created = await store.add(booking)
      sendJson(res, 201, { data: created })
      return
      // END API-POST
    }
    res.setHeader('Allow', 'GET, POST')
    throw new HttpError(405, 'METHOD', 'Для списка доступны GET и POST.')
  }

  const match = /^\/api\/bookings\/([^/]+)$/.exec(pathname)
  if (match) {
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'PATCH')
      throw new HttpError(405, 'METHOD', 'Для одной заявки доступен PATCH.')
    }
    // Шаг 9 · API-PATCH: успешная ветка готова; прочитайте её по аналогу POST.
    const id = decodeURIComponent(match[1])
    validateConfirmation(await readJson(req))
    const updated = await store.confirm(id)
    if (updated === null) {
      // Шаг 9 · NOT-FOUND: замените учебный отказ на 404 с кодом NOT_FOUND.
      // START NOT-FOUND
      throw new HttpError(404, 'NOT_FOUND', 'Заявка не найдена.')
      // END NOT-FOUND
    }
    sendJson(res, 200, { data: updated })
    return
  }
  throw new HttpError(404, 'NOT_FOUND', 'Маршрут не найден.')
}
