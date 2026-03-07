import type { HttpContext } from '@adonisjs/core/http'
import Feedback from '#models/feedback'
import Appointment from '#models/appointment'
import vine from '@vinejs/vine'

const createFeedbackSchema = vine.compile(vine.object({
  appointmentId: vine.string(),
  role: vine.enum(['student', 'mentor']),
  rating: vine.number().min(1).max(5).optional(),
  comment: vine.string().trim().optional(),
  satisfaction: vine.enum(['very_satisfied', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied']),
  topics: vine.array(vine.string()).optional(),
}))

export default class FeedbackController {
  /**
   * POST /api/feedback
   */
  async store({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!

    const data = await request.validateUsing(createFeedbackSchema)
    const appointmentId = parseInt(data.appointmentId, 10)
    if (Number.isNaN(appointmentId)) {
      return response.badRequest({ message: 'Agendamento inválido' })
    }

    const appointment = await Appointment.find(appointmentId)
    if (!appointment) {
      return response.notFound({ message: 'Agendamento não encontrado' })
    }

    if (data.role === 'student' && appointment.studentId !== user.id) {
      return response.forbidden({ message: 'Este agendamento não é seu' })
    }
    if (data.role === 'mentor' && appointment.mentorId !== user.id) {
      return response.forbidden({ message: 'Este agendamento não é seu' })
    }

    const existing = await Feedback.query()
      .where('appointment_id', appointmentId)
      .where('user_type', data.role)
      .first()
    if (existing) {
      return response.badRequest({ message: 'Feedback já enviado para esta mentoria' })
    }

    await Feedback.create({
      appointmentId: appointment.id,
      userType: data.role,
      rating: data.rating ?? null,
      comment: data.comment ?? null,
      satisfaction: data.satisfaction,
      topics: data.topics ?? null,
    })

    return response.created({ message: 'Feedback enviado com sucesso' })
  }
}
