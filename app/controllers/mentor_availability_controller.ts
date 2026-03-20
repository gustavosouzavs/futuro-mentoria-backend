import type { HttpContext } from '@adonisjs/core/http'
import MentorAvailability from '#models/mentor_availability'
import ScheduleConfig from '#models/schedule_config'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { getAllowedTimeSlotsForDate } from '#services/schedule_config_service'

const createAvailabilitySchema = vine.compile(vine.object({
  date: vine.string(),
  times: vine.array(vine.string().regex(/^\d{2}:\d{2}$/)),
  status: vine.enum(['available', 'unavailable']),
}))

const updateAvailabilitySchema = vine.compile(vine.object({
  status: vine.enum(['available', 'booked', 'unavailable']),
}))

export default class MentorAvailabilityController {
  /**
   * GET /api/mentor/availability?date=YYYY-MM-DD
   */
  async index({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const query = MentorAvailability.query().where('mentor_id', user.id)
    const date = request.input('date')
    if (date) {
      query.where('date', date)
    }
    const availabilities = await query.orderBy('date').orderBy('time')

    const list = availabilities.map((a) => ({
      id: String(a.id),
      date: a.date.toISODate(),
      time: a.time,
      status: a.status,
    }))

    return response.ok({ availabilities: list })
  }

  /**
   * POST /api/mentor/availability
   */
  async store({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const data = await request.validateUsing(createAvailabilitySchema)
    const dateStr = data.date.slice(0, 10)
    const date = DateTime.fromISO(dateStr)

    const scheduleConfig = await ScheduleConfig.first()
    const allowedTimesForDate = getAllowedTimeSlotsForDate(scheduleConfig, dateStr)
    if (data.status === 'available' && allowedTimesForDate !== null) {
      if (allowedTimesForDate.length === 0) {
        return response.badRequest({
          message: 'Dia desativado pelo administrador para mentorias',
        })
      }
      const invalidTimes = data.times.filter((t) => !allowedTimesForDate.includes(t))
      if (invalidTimes.length > 0) {
        return response.badRequest({
          message: 'Alguns horários não estão permitidos pelo administrador',
          invalidTimes,
        })
      }
    }

    const created: { id: string; date: string; time: string; status: string }[] = []
    for (const time of data.times) {
      const existing = await MentorAvailability.query()
        .where('mentor_id', user.id)
        .where('date', dateStr)
        .where('time', time)
        .first()
      if (!existing) {
        const a = await MentorAvailability.create({
          mentorId: user.id,
          date,
          time,
          status: data.status as 'available' | 'unavailable',
        })
        created.push({
          id: String(a.id),
          date: dateStr,
          time: a.time,
          status: a.status,
        })
      }
    }

    return response.created({ availabilities: created })
  }

  /**
   * PATCH /api/mentor/availability/:id
   */
  async update({ params, request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const id = parseInt(params.id, 10)
    const availability = await MentorAvailability.query().where('id', id).where('mentor_id', user.id).first()
    if (!availability) {
      return response.notFound({ message: 'Disponibilidade não encontrada' })
    }

    const data = await request.validateUsing(updateAvailabilitySchema)

    if (data.status === 'available') {
      const scheduleConfig = await ScheduleConfig.first()
      const dateOnly = availability.date.toISODate()
      if (!dateOnly) {
        return response.badRequest({ message: 'Data inválida para validação de horário' })
      }
      const allowedTimesForDate = getAllowedTimeSlotsForDate(scheduleConfig, dateOnly)

      if (allowedTimesForDate !== null && !allowedTimesForDate.includes(availability.time)) {
        return response.badRequest({
          message: 'Este horário não está permitido pelo administrador',
        })
      }
    }

    availability.status = data.status as 'available' | 'booked' | 'unavailable'
    await availability.save()

    return response.ok({ message: 'Atualizado com sucesso' })
  }

  /**
   * DELETE /api/mentor/availability/:id
   */
  async destroy({ params, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const id = parseInt(params.id, 10)
    const availability = await MentorAvailability.query().where('id', id).where('mentor_id', user.id).first()
    if (!availability) {
      return response.notFound({ message: 'Disponibilidade não encontrada' })
    }

    await availability.delete()
    return response.ok({ message: 'Removido com sucesso' })
  }
}
