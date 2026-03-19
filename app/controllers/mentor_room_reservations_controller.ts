import type { HttpContext } from '@adonisjs/core/http'
import Room from '#models/room'
import RoomReservation from '#models/room_reservation'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const reserveSchema = vine.compile(
  vine.object({
    roomId: vine.number(),
    date: vine.string(),
    reservedFrom: vine.string().regex(/^\d{2}:\d{2}$/),
    reservedUntil: vine.string().regex(/^\d{2}:\d{2}$/),
  })
)

/** Minutos desde meia-noite; intervalo [start, end) em minutos para sobreposição */
const DEFAULT_DAY_START_MIN = 14 * 60
const DEFAULT_DAY_END_MIN = 18 * 60 + 30

function parseHHmm(t: string | null): number | null {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function effectiveInterval(r: RoomReservation): { start: number; end: number } {
  const endM = parseHHmm(r.reservedUntil)
  const startM = parseHHmm(r.reservedFrom)
  const start = startM ?? DEFAULT_DAY_START_MIN
  const end = endM ?? DEFAULT_DAY_END_MIN
  return { start, end }
}

function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end
}

export default class MentorRoomReservationsController {
  /** GET /api/mentor/rooms - Lista salas cadastradas para o mentor escolher */
  async rooms({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    if (auth.user!.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const rooms = await Room.query().orderBy('name')
    return response.ok({
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        location: r.location,
      })),
    })
  }

  /** POST /api/mentor/room-reservations - Reserva uma sala na data (faixa de horário) */
  async store({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const data = await request.validateUsing(reserveSchema)
    const dateStr = data.date.slice(0, 10)

    const room = await Room.find(data.roomId)
    if (!room) return response.notFound({ message: 'Sala não encontrada' })

    const newStart = parseHHmm(data.reservedFrom)!
    const newEnd = parseHHmm(data.reservedUntil)!
    if (newStart >= newEnd) {
      return response.badRequest({ message: 'Horário inicial deve ser anterior ao horário final.' })
    }

    const newRange = { start: newStart, end: newEnd }

    const existingList = await RoomReservation.query().where('room_id', data.roomId).where('date', dateStr)

    for (const ex of existingList) {
      if (rangesOverlap(newRange, effectiveInterval(ex))) {
        return response.badRequest({
          message: 'Já existe reserva nesta sala que conflita com o horário escolhido.',
          reservedBy: ex.mentorId === user.id ? 'you' : 'another_mentor',
        })
      }
    }

    const reservation = await RoomReservation.create({
      roomId: room.id,
      mentorId: user.id,
      date: DateTime.fromISO(dateStr),
      reservedFrom: data.reservedFrom,
      reservedUntil: data.reservedUntil,
    })
    await reservation.load('room')
    return response.created({
      id: reservation.id,
      roomId: reservation.roomId,
      roomName: reservation.room.name,
      date: dateStr,
      reservedFrom: reservation.reservedFrom,
      reservedUntil: reservation.reservedUntil,
      message: 'Sala reservada com sucesso.',
    })
  }

  /** GET /api/mentor/room-reservations - Minhas reservas */
  async index({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const dateFrom = request.input('dateFrom')
    const dateTo = request.input('dateTo')
    let query = RoomReservation.query()
      .where('mentor_id', user.id)
      .preload('room')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
    if (dateFrom) query = query.where('date', '>=', String(dateFrom).slice(0, 10))
    if (dateTo) query = query.where('date', '<=', String(dateTo).slice(0, 10))
    const reservations = await query
    return response.ok({
      reservations: reservations.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        roomName: r.room.name,
        roomCode: r.room.code,
        date: r.date.toISODate(),
        reservedFrom: r.reservedFrom,
        reservedUntil: r.reservedUntil,
      })),
    })
  }

  /** DELETE /api/mentor/room-reservations/:id - Cancela minha reserva */
  async destroy({ params, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const id = parseInt(params.id, 10)
    const reservation = await RoomReservation.query()
      .where('id', id)
      .where('mentor_id', user.id)
      .first()
    if (!reservation) return response.notFound({ message: 'Reserva não encontrada' })
    await reservation.delete()
    return response.ok({ message: 'Reserva cancelada' })
  }
}
