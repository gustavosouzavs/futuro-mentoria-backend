import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import ScheduleConfig from '#models/schedule_config'
import { getAllowedTimeSlotsForDate } from '#services/schedule_config_service'

export default class MentorsController {
  /**
   * GET /api/mentors?date=YYYY-MM-DD
   * Returns mentors with available slots count and the list of available time slots for the given date.
   */
  async index({ request, response }: HttpContext) {
    const dateParam = request.input('date')
    const date = dateParam ? new Date(dateParam) : new Date()
    const dateStr = date.toISOString().slice(0, 10)

    const scheduleConfig = await ScheduleConfig.first()
    const allowedTimes = getAllowedTimeSlotsForDate(scheduleConfig, dateStr)

    const mentors = await User.query()
      .where('role', 'mentor')
      .where('status', 'active')
      .orderBy('full_name')

    const availabilityQuery = db
      .from('mentor_availabilities')
      .select('mentor_id', 'time')
      .where('date', dateStr)
      .where('status', 'available')

    if (allowedTimes !== null) {
      if (allowedTimes.length === 0) {
        return response.ok({
          mentors: mentors.map((m) => ({
            id: String(m.id),
            name: m.fullName || `Mentor ${m.id}`,
            specialties: m.specialties || [],
            availableSlots: 0,
            availableTimes: [],
          })),
        })
      }
      availabilityQuery.whereIn('time', allowedTimes)
    }

    const availabilityRows = await availabilityQuery
      .orderBy('mentor_id')
      .orderBy('time')

    const slotsByMentor = new Map<number, string[]>()
    for (const row of availabilityRows as { mentor_id: number; time: string }[]) {
      const arr = slotsByMentor.get(row.mentor_id) ?? []
      arr.push(row.time)
      slotsByMentor.set(row.mentor_id, arr)
    }

    const list = mentors.map((m) => {
      const slots = slotsByMentor.get(m.id) ?? []
      return {
        id: String(m.id),
        name: m.fullName || `Mentor ${m.id}`,
        specialties: m.specialties || [],
        availableSlots: slots.length,
        availableTimes: slots,
      }
    })

    return response.ok({ mentors: list })
  }
}
