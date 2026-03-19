import type { HttpContext } from '@adonisjs/core/http'
import Appointment from '#models/appointment'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

export default class MentorAppointmentsController {
  /**
   * GET /api/mentor/appointments
   */
  async index({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const appointments = await Appointment.query()
      .where('mentor_id', user.id)
      .preload('student')
      .preload('materials')
      .orderBy('scheduled_at', 'desc')

    const feedbackAppointmentIds = await db
      .from('feedbacks')
      .select('appointment_id')
      .where('user_type', 'mentor')
      .then((rows) => rows.map((r: { appointment_id: number }) => Number(r.appointment_id)))

    const list = appointments.map((a) => {
      const studentName = a.studentName || (a.student ? (a.student as User).fullName : null) || 'Estudante'
      const studentEmail = a.studentEmail || (a.student ? (a.student as User).email : null) || ''
      return {
        id: String(a.id),
        studentName,
        studentEmail,
        subject: a.subject,
        date: a.scheduledAt.toISO(),
        time: a.timeSlot,
        status: a.status,
        hasFeedback: feedbackAppointmentIds.includes(Number(a.id)),
        hasMaterial: (a.materials?.length ?? 0) > 0,
        hasMessage: !!a.message,
      }
    })

    return response.ok({ appointments: list })
  }

  /**
   * GET /api/mentor/appointments/:id
   */
  async show({ params, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const id = parseInt(params.id, 10)
    const appointment = await Appointment.query()
      .where('id', id)
      .where('mentor_id', user.id)
      .preload('student')
      .preload('materials')
      .first()

    if (!appointment) {
      return response.notFound({ message: 'Agendamento não encontrado' })
    }

    const student = appointment.student as User | null
    const studentName = appointment.studentName || student?.fullName || 'Estudante'
    const studentEmail = appointment.studentEmail || student?.email || ''
    const studentPhone = student?.phone ?? null

    const mentorFeedback = await appointment
      .related('feedbacks')
      .query()
      .where('user_type', 'mentor')
      .first()

    const materials = (appointment.materials || []).map((m) => ({
      id: String(m.id),
      name: m.name,
      url: m.url,
      type: m.type,
      uploadedAt: m.uploadedAt.toISO(),
    }))

    return response.ok({
      id: String(appointment.id),
      studentName,
      studentEmail,
      studentPhone: studentPhone ?? undefined,
      subject: appointment.subject,
      date: appointment.scheduledAt.toISO(),
      time: appointment.timeSlot,
      status: appointment.status,
      message: appointment.message ?? undefined,
      preparationItems: appointment.preparationItems ?? undefined,
      materials,
      hasFeedback: !!mentorFeedback,
    })
  }

  /**
   * PATCH /api/mentor/appointments/:id
   */
  async update({ params, request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const id = parseInt(params.id, 10)
    const appointment = await Appointment.query().where('id', id).where('mentor_id', user.id).first()

    if (!appointment) {
      return response.notFound({ message: 'Agendamento não encontrado' })
    }

    const body = request.body() as {
      message?: string | null
      preparationItems?: string[]
      status?: string
    }

    if ('message' in body) {
      appointment.message =
        body.message === null || body.message === '' ? null : String(body.message)
    }
    if (body.preparationItems !== undefined) {
      appointment.preparationItems = body.preparationItems
    }
    if (body.status !== undefined) {
      const next = body.status as Appointment['status']
      const allowed: Appointment['status'][] = ['pending', 'confirmed', 'completed', 'cancelled']
      if (!allowed.includes(next)) {
        return response.badRequest({ message: 'Status inválido.' })
      }
      if (next === 'confirmed' && appointment.status !== 'pending') {
        return response.badRequest({ message: 'Só é possível confirmar uma mentoria pendente.' })
      }
      if (next === 'completed' && appointment.status !== 'confirmed') {
        return response.badRequest({ message: 'Só é possível encerrar uma mentoria confirmada.' })
      }
      if (next === 'cancelled' && !['pending', 'confirmed'].includes(appointment.status)) {
        return response.badRequest({ message: 'Não é possível cancelar neste status.' })
      }
      appointment.status = next
    }

    await appointment.save()

    return response.ok({ message: 'Atualizado com sucesso' })
  }
}
