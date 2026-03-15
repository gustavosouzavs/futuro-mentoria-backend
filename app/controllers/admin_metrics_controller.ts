import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { subDays } from 'date-fns'

/**
 * GET /api/admin/metrics
 * Dashboard de métricas para administradores.
 */
export default class AdminMetricsController {
  async index({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const [totalUsers] = await db.from('users').count('* as total')
    const [totalStudents] = await db.from('users').where('role', 'student').count('* as total')
    const [totalMentors] = await db.from('users').where('role', 'mentor').count('* as total')
    const [totalAppointments] = await db.from('appointments').count('* as total')
    const [totalFeedbacks] = await db.from('feedbacks').count('* as total')

    const byStatus = await db
      .from('appointments')
      .select('status')
      .count('* as total')
      .groupBy('status')

    const statusMap: Record<string, number> = {}
    for (const row of byStatus as { status: string; total: string }[]) {
      statusMap[row.status] = Number(row.total)
    }

    const [avgRatingRow] = await db.from('feedbacks').avg('rating as avg').whereNotNull('rating')
    const avgRating = avgRatingRow ? Number((avgRatingRow as { avg: string })?.avg) : null


    const to = subDays(new Date(), 30)
    const from = new Date()

    const last30Days = await db
      .from('appointments')
      .whereBetween('created_at', [from, to])
      .count('* as total')
      .first()
    const appointmentsLast30Days = Number((last30Days as { total: string })?.total ?? 0)

    const completedLast30Days = await db
      .from('appointments')
      .where('status', 'completed')
      .whereBetween('updated_at', [from, to])
      .count('* as total')
      .first()
    const completedLast30 = Number((completedLast30Days as { total: string })?.total ?? 0)

    const appointmentsWithoutStudentFeedback = await db
      .from('appointments')
      .leftJoin('feedbacks', (q) => {
        q.on('feedbacks.appointment_id', '=', 'appointments.id')
      })
      .whereNull('feedbacks.id')
      .count('* as total')
      .first()
    const pendingFeedbackCount = Number((appointmentsWithoutStudentFeedback as { total: string })?.total ?? 0)

    return response.ok({
      totalUsers: Number((totalUsers as { total: string })?.total ?? 0),
      totalStudents: Number((totalStudents as { total: string })?.total ?? 0),
      totalMentors: Number((totalMentors as { total: string })?.total ?? 0),
      totalAppointments: Number((totalAppointments as { total: string })?.total ?? 0),
      totalFeedbacks: Number((totalFeedbacks as { total: string })?.total ?? 0),
      appointmentsByStatus: statusMap,
      averageRating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
      appointmentsLast30Days,
      completedLast30Days: completedLast30,
      appointmentsWithoutStudentFeedback: pendingFeedbackCount,
    })
  }
}
