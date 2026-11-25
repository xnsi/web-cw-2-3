import type { Booking, NewBooking } from '../models/booking.ts'

// Шаг 11 · ERROR: прочитайте готовую проверку response.ok и путь ошибки в main.ts.
// HTTP 400/404/500 сами по себе не отклоняют Promise, возвращённый fetch.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, options)
  } catch {
    throw new Error('Нет связи. Проверьте терминалы API и Vite, затем повторите загрузку.')
  }
  const text = await response.text()
  type Envelope = { data?: T; error?: { message?: string } }
  let body: Envelope | null = null
  try { body = JSON.parse(text) as Envelope } catch { /* Proxy может прислать не JSON. */ }
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `HTTP ${response.status}. Проверьте терминалы API и Vite.`)
  }
  if (body === null || typeof body !== 'object' || !('data' in body)) {
    throw new Error('Сервер вернул неожиданный ответ вместо { data: ... }.')
  }
  return body.data as T
}

export async function getBookings(): Promise<Booking[]> {
  // Шаг 2 · CLIENT-LIST: замените заглушку вызовом request для GET списка.
  // START CLIENT-LIST
  return request<Booking[]>('/api/bookings')
  // END CLIENT-LIST
}

export async function createBooking(input: NewBooking): Promise<Booking> {
  // Шаг 5 · CLIENT-CREATE: добавьте POST с JSON-телом и Content-Type.
  // START CLIENT-CREATE
  return request<Booking>('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  // END CLIENT-CREATE
}

// Шаг 10 · CLIENT-CONFIRM: уже готово. Сравните с POST, затем вызовите из main.ts.
export async function confirmBooking(id: string): Promise<Booking> {
  return request<Booking>('/api/bookings/' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'confirmed' }),
  })
}
