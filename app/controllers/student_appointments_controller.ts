import type { HttpContext } from '@adonisjs/core/http'
import Appointment from '#models/appointment'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'

const updatePreparationItemsSchema = vine.compile(
  vine.object({
    preparationItems: vine.array(vine.string().trim().minLength(1)).optional(),
  }),
)

export default class StudentAppointmentsController {
  /**
   * GET /api/student/appointments - list for current student (auth)
   */
  async index({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'student') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const appointments = await Appointment.query()
      .where('student_id', user.id)
      .preload('mentor')
      .preload('materials')
      .preload('feedbacks')
      .orderBy('scheduled_at', 'desc')

    const feedbackAppointmentIds = await db
      .from('feedbacks')
      .select('appointment_id')
      .where('user_type', 'student')
      .then((rows) => rows.map((r: { appointment_id: number }) => r.appointment_id))

    const list = appointments.map((a) => {
      const mentor = a.mentor
      const hasFeedback = feedbackAppointmentIds.includes(a.id)
      return {
        id: String(a.id),
        mentorName: mentor?.fullName || 'Mentor',
        subject: a.subject,
        date: a.scheduledAt.toISO(),
        time: a.timeSlot,
        status: a.status,
        hasFeedback,
        hasMaterial: (a.materials?.length ?? 0) > 0,
        hasMessage: !!a.message,
        needsPreparation: Array.isArray(a.preparationItems) && a.preparationItems.length > 0,
      }
    })

    return response.ok({ appointments: list })
  }

  /**
   * GET /api/student/appointments/:id
   */
  async show({ params, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'student') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const id = parseInt(params.id, 10)
    const appointment = await Appointment.query()
      .where('id', id)
      .where('student_id', user.id)
      .preload('mentor')
      .preload('materials')
      .first()

    if (!appointment) {
      return response.notFound({ message: 'Agendamento não encontrado' })
    }

    const feedbacks = await appointment.related('feedbacks').query().where('user_type', 'student')
    const hasFeedback = feedbacks.length > 0

    const materials = (appointment.materials || []).map((m) => ({
      id: String(m.id),
      name: m.name,
      url: m.url,
      type: m.type,
      uploadedAt: m.uploadedAt.toISO(),
    }))

    return response.ok({
      id: String(appointment.id),
      mentorName: appointment.mentor?.fullName || 'Mentor',
      mentorEmail: appointment.mentor?.email || '',
      subject: appointment.subject,
      date: appointment.scheduledAt.toISO(),
      time: appointment.timeSlot,
      status: appointment.status,
      message: appointment.message ?? undefined,
      preparationItems: appointment.preparationItems ?? undefined,
      materials,
      hasFeedback,
    })
  }

  /**
   * PATCH /api/student/appointments/:id/preparation-items
   */
  async updatePreparationItems({ params, request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'student') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const id = parseInt(params.id, 10)
    const appointment = await Appointment.query()
      .where('id', id)
      .where('student_id', user.id)
      .first()

    if (!appointment) {
      return response.notFound({ message: 'Agendamento não encontrado' })
    }

    const data = await request.validateUsing(updatePreparationItemsSchema)
    appointment.preparationItems =
      data.preparationItems && data.preparationItems.length > 0 ? data.preparationItems : null
    await appointment.save()

    return response.ok({ message: 'Materiais atualizados com sucesso' })
  }
}
