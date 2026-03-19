import type { HttpContext } from '@adonisjs/core/http'
import RoomReservation from '#models/room_reservation'

/**
 * GET /api/rooms/reservations?date=YYYY-MM-DD
 * Retorna quais salas têm qual mentor e até qual horário na data informada.
 * Pode ser usado por qualquer usuário autenticado ou público (conforme necessidade).
 */
export default class RoomReservationsController {
  async index({ request, response }: HttpContext) {
    const dateParam = request.input('date')
    const dateStr = dateParam ? String(dateParam).slice(0, 10) : new Date().toISOString().slice(0, 10)

    const reservations = await RoomReservation.query()
      .where('date', dateStr)
      .preload('room')
      .preload('mentor')
      .orderBy('room_id')

    const list = reservations.map((r) => ({
      roomId: r.roomId,
      roomName: r.room.name,
      roomCode: r.room.code,
      mentorId: r.mentorId,
      mentorName: r.mentor.fullName || `Mentor ${r.mentorId}`,
      date: dateStr,
      reservedFrom: r.reservedFrom,
      reservedUntil: r.reservedUntil,
    }))

    return response.ok({
      date: dateStr,
      reservations: list,
    })
  }
}
