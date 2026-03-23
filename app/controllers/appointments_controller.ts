import type { HttpContext } from '@adonisjs/core/http'
import Appointment from '#models/appointment'
import MentorAvailability from '#models/mentor_availability'
import ScheduleConfig from '#models/schedule_config'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { getAllowedTimeSlotsForDate } from '#services/schedule_config_service'

const createAppointmentSchema = vine.compile(vine.object({
  studentName: vine.string().trim().minLength(2),
  studentEmail: vine.string().email(),
  grade: vine.string().trim(),
  mentorId: vine.string(),
  subject: vine.string().optional(),
  date: vine.string(), // YYYY-MM-DD (ou ISO)
  time: vine.string().regex(/^\d{2}:\d{2}$/),
  message: vine.string().trim().optional(),
  preparationItems: vine.array(vine.string().trim().minLength(1)).optional(),
  studentId: vine.number(),
}))

export default class AppointmentsController {
  /**
   * POST /api/appointments (public - booking form)
   */
  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createAppointmentSchema)
    const mentorId = parseInt(data.mentorId, 10)
    if (Number.isNaN(mentorId)) {
      return response.badRequest({ message: 'Mentor inválido' })
    }
    const mentor = await User.find(mentorId)
    if (!mentor || mentor.role !== 'mentor') {
      return response.badRequest({ message: 'Mentor não encontrado' })
    }

    if (data.studentId != null) {
      const withoutFeedback = await db
        .from('appointments')
        .leftJoin('feedbacks', (q) => {
          q.on('feedbacks.appointment_id', '=', 'appointments.id')
        })
        .where('appointments.student_id', data.studentId)
        .whereNull('feedbacks.id')
        .count('* as total')
        .first()
      const count = Number((withoutFeedback as { total: string })?.total ?? 0)
      if (count >= 2) {
        return response.badRequest({
          message: 'Você só pode agendar até 2 mentorias por vez. Dê feedback das mentorias anteriores para agendar uma nova.',
        })
      }
    }

    const dateOnly = data.date.slice(0, 10)

    const scheduleConfig = await ScheduleConfig.first()
    const allowedTimesForDate = getAllowedTimeSlotsForDate(scheduleConfig, dateOnly)
    if (allowedTimesForDate !== null && !allowedTimesForDate.includes(data.time)) {
      return response.badRequest({
        message: 'Horário não está permitido pelo administrador',
      })
    }

    const availability = await MentorAvailability.query()
      .where('mentor_id', mentorId)
      .where('date', dateOnly)
      .where('time', data.time)
      .where('status', 'available')
      .first()

    if (!availability) {
      return response.badRequest({ message: 'Horário não está mais disponível' })
    }

    const scheduledAt = DateTime.fromISO(`${dateOnly}T${data.time}:00`, { zone: 'utc' })
    const appointment = await Appointment.create({
      studentId: data.studentId ?? null,
      mentorId,
      subject: data.subject ?? "",
      scheduledAt,
      timeSlot: data.time,
      status: 'pending',
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      studentGrade: data.grade,
      message: data.message ?? null,
      preparationItems:
        data.preparationItems && data.preparationItems.length > 0 ? data.preparationItems : null,
    })

    await availability.merge({ status: 'booked' }).save()

    return response.created({
      id: String(appointment.id),
      message: 'Agendamento realizado com sucesso',
    })
  }
}
