import type { HttpContext } from '@adonisjs/core/http'
import Appointment from '#models/appointment'
import User from '#models/user'

export default class AdminAppointmentsController {
  /**
   * GET /api/admin/appointments
   */
  async index({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const appointments = await Appointment.query()
      .preload('mentor')
      .preload('student')
      .preload('materials')
      .preload('feedbacks')
      .orderBy('scheduled_at', 'desc')

    const list = appointments.map((a) => {
      const mentor = a.mentor as User | null
      const student = a.student as User | null

      const studentFeedback = (a.feedbacks ?? []).find((f) => f.userType === 'student')
      const mentorFeedback = (a.feedbacks ?? []).find((f) => f.userType === 'mentor')

      return {
        id: String(a.id),
        status: a.status,
        subject: a.subject,
        date: a.scheduledAt.toISO(),
        time: a.timeSlot,
        createdAt: a.createdAt.toISO(),
        updatedAt: a.updatedAt?.toISO() ?? null,
        message: a.message ?? null,
        preparationItems: a.preparationItems ?? [],
        mentor: {
          id: String(a.mentorId),
          name: mentor?.fullName || `Mentor ${a.mentorId}`,
          email: mentor?.email || '',
          phone: mentor?.phone || null,
        },
        student: {
          id: a.studentId ? String(a.studentId) : null,
          name: a.studentName || student?.fullName || 'Estudante',
          email: a.studentEmail || student?.email || '',
          phone: student?.phone || null,
          grade: a.studentGrade || student?.grade || null,
        },
        materials: (a.materials ?? []).map((m) => ({
          id: String(m.id),
          name: m.name,
          url: m.url,
          type: m.type,
          uploadedAt: m.uploadedAt.toISO(),
        })),
        feedbacks: {
          student: studentFeedback
            ? {
                id: String(studentFeedback.id),
                rating: studentFeedback.rating,
                comment: studentFeedback.comment,
                satisfaction: studentFeedback.satisfaction,
                topics: studentFeedback.topics ?? [],
                createdAt: studentFeedback.createdAt.toISO(),
              }
            : null,
          mentor: mentorFeedback
            ? {
                id: String(mentorFeedback.id),
                rating: mentorFeedback.rating,
                comment: mentorFeedback.comment,
                satisfaction: mentorFeedback.satisfaction,
                topics: mentorFeedback.topics ?? [],
                createdAt: mentorFeedback.createdAt.toISO(),
              }
            : null,
        },
      }
    })

    return response.ok({ appointments: list })
  }
}

