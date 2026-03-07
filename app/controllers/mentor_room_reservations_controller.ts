import type { HttpContext } from '@adonisjs/core/http'
import Room from '#models/room'
import RoomReservation from '#models/room_reservation'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const reserveSchema = vine.compile(vine.object({
  roomId: vine.number(),
  date: vine.string(),
  reservedUntil: vine.string().regex(/^\d{2}:\d{2}$/).optional(),
}))

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

  /** POST /api/mentor/room-reservations - Reserva uma sala na data */
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

    const existing = await RoomReservation.query()
      .where('room_id', data.roomId)
      .where('date', dateStr)
      .first()
    if (existing) {
      return response.badRequest({
        message: 'Esta sala já está reservada para esta data.',
        reservedBy: existing.mentorId === user.id ? 'you' : 'another_mentor',
      })
    }

    const reservation = await RoomReservation.create({
      roomId: room.id,
      mentorId: user.id,
      date: DateTime.fromISO(dateStr),
      reservedUntil: data.reservedUntil ?? null,
    })
    await reservation.load('room')
    return response.created({
      id: reservation.id,
      roomId: reservation.roomId,
      roomName: reservation.room.name,
      date: dateStr,
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
