import './style.css'
import './components/booking-card.ts'
import type { BookingCard } from './components/booking-card.ts'
import type { Booking } from './models/booking.ts'
import { getBookings, createBooking, confirmBooking } from './api/bookings.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main>
    <header><p class="eyebrow">ВЕБ-МАСТЕРСКАЯ · УЧЕБНЫЙ НАБОР 2–3</p>
      <h1>Заявки на мастерскую</h1><p class="intro">Добавляйте участников и подтверждайте запись на встречу.</p></header>
    <section class="panel" aria-labelledby="form-title"><h2 id="form-title">Новая заявка</h2>
      <form id="form" novalidate><fieldset id="fields">
        <label>Имя<input name="name" autocomplete="given-name" placeholder="Например, Мария"></label>
        <label>Участников<input name="seats" type="number" min="1" max="5" step="1" value="1"></label>
        <button type="submit">Добавить заявку</button>
      </fieldset></form>
      <p id="message" role="status" aria-live="polite">Загружаем список…</p>
    </section>
    <div class="toolbar"><p class="summary">Участников: <strong id="total">0</strong>
      <span>Заявок: <strong id="count">0</strong></span></p>
      <button id="reload" type="button" class="secondary">Обновить список</button></div>
    <p id="list-note" class="muted">После загрузки здесь появятся данные сервера.</p>
    <div id="lists" class="columns">
      <section aria-labelledby="all-title"><h2 id="all-title">Все заявки</h2><div id="all" class="cards"></div></section>
      <section aria-labelledby="confirmed-title"><h2 id="confirmed-title">Подтверждённые</h2><div id="confirmed" class="cards"></div></section>
    </div>
    <footer>Учебные данные вымышлены. Обновление списка получает актуальный ответ сервера.</footer>
  </main>`

const all = document.querySelector<HTMLElement>('#all')!
const confirmed = document.querySelector<HTMLElement>('#confirmed')!
const form = document.querySelector<HTMLFormElement>('#form')!
const fields = document.querySelector<HTMLFieldSetElement>('#fields')!
const message = document.querySelector<HTMLElement>('#message')!
const reload = document.querySelector<HTMLButtonElement>('#reload')!
const lists = document.querySelector<HTMLElement>('#lists')!
const note = document.querySelector<HTMLElement>('#list-note')!
let bookings: Booking[] = []
let busy = false
let loaded = false
const allCards = new Map<string, BookingCard>()
const confirmedCards = new Map<string, BookingCard>()

// Готово: сохраняем экземпляры компонентов и передаём обновлённый объект в обе области.
function sync(target: HTMLElement, cards: Map<string, BookingCard>, rows: Booking[]) {
  for (const [id, card] of cards) {
    if (!rows.some(row => row.id === id)) { card.remove(); cards.delete(id) }
  }
  for (const booking of rows) {
    let card = cards.get(booking.id)
    if (!card) { card = document.createElement('booking-card') as BookingCard; cards.set(booking.id, card) }
    card.booking = booking
    card.busy = busy
    if (card.parentElement !== target) target.append(card)
  }
}
function render() {
  sync(all, allCards, bookings)
  sync(confirmed, confirmedCards, bookings.filter(row => row.status === 'confirmed'))
  document.querySelector('#total')!.textContent = String(bookings.reduce((sum, row) => sum + row.seats, 0))
  document.querySelector('#count')!.textContent = String(bookings.length)
}
function setBusy(value: boolean) {
  busy = value
  fields.disabled = value || !loaded
  reload.disabled = value
  lists.setAttribute('aria-busy', String(value))
  render()
}
function showMessage(text: string, error = false) {
  message.textContent = text
  message.classList.toggle('error', error)
}

// Шаг 2 · LOAD: готовый путь ответа в карточки. Локального массива-запаски нет.
async function loadBookings() {
  if (busy) return
  setBusy(true)
  showMessage('Загружаем список…')
  try {
    bookings = await getBookings()
    loaded = true
    note.textContent = bookings.length ? '' : 'Пока нет заявок.'
    showMessage('Список загружен.')
  } catch (error) {
    note.textContent = loaded ? 'Показан последний загруженный список. Обновите после восстановления связи.' : 'Список ещё не загружен.'
    showMessage(error instanceof Error ? error.message : 'Не удалось загрузить список.', true)
  } finally { setBusy(false) }
}
reload.addEventListener('click', () => { void loadBookings() })

form.addEventListener('submit', (event) => {
  event.preventDefault()
  if (!busy && loaded) void submitBooking()
})
async function submitBooking() {
  const data = new FormData(form)
  const name = String(data.get('name') ?? '').trim()
  const raw = String(data.get('seats') ?? '').trim()
  const seats = raw === '' ? NaN : Number(raw)
  if (!name) { showMessage('Укажите непустое имя.', true); return }
  if (!Number.isInteger(seats) || seats < 1 || seats > 5) {
    showMessage('Введите целое число участников от 1 до 5.', true); return
  }
  setBusy(true)
  showMessage('Сохраняем заявку…')
  try {
    // Шаг 5 · SUBMIT: вместо заглушки дождитесь createBooking и добавьте ответ в массив.
    // START SUBMIT
    const created = await createBooking({ name, seats })
    bookings = [...bookings, created]
    // END SUBMIT
    form.reset()
    note.textContent = ''
    showMessage('Заявка добавлена.')
  } catch (error) {
    // Шаг 11 · ERROR: при отказе ввод остаётся, карточка не добавляется.
    showMessage(error instanceof Error ? error.message : 'Не удалось создать заявку.', true)
  } finally { setBusy(false) }
}

lists.addEventListener('booking-confirm', (event) => {
  if (!(event instanceof CustomEvent) || typeof event.detail?.id !== 'string' || busy) return
  if (!bookings.some(row => row.id === event.detail.id && row.status === 'new')) return
  void confirmFromCard(event.detail.id)
})
async function confirmFromCard(id: string) {
  setBusy(true)
  showMessage('Подтверждаем заявку…')
  try {
    // Шаг 10 · CONFIRM: вызовите готовый API-клиент, замените запись ответом сервера.
    // START CONFIRM
    const updated = await confirmBooking(id)
    bookings = bookings.map(row => row.id === id ? updated : row)
    // END CONFIRM
    showMessage('Заявка подтверждена.')
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Не удалось подтвердить заявку.', true)
  } finally { setBusy(false) }
}
void loadBookings()
