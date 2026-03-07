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

    const feedbackAppointmentIds = await db.from('feedbacks').select('appointment_id').then((rows) => rows.map((r: { appointment_id: number }) => r.appointment_id))

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
        hasFeedback: feedbackAppointmentIds.includes(a.id),
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
      subject: appointment.subject,
      date: appointment.scheduledAt.toISO(),
      time: appointment.timeSlot,
      status: appointment.status,
      message: appointment.message ?? undefined,
      preparationItems: appointment.preparationItems ?? undefined,
      materials,
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

    const body = request.body()
    if (body.message !== undefined) appointment.message = body.message
    if (body.preparationItems !== undefined) appointment.preparationItems = body.preparationItems
    if (body.status !== undefined) appointment.status = body.status
    await appointment.save()

    return response.ok({ message: 'Atualizado com sucesso' })
  }
}
