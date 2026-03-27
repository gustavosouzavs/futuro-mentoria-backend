import Appointment from '#models/appointment'
import User from '#models/user'
import { DateTime } from 'luxon'

export type ReportSummary = {
  from: string
  to: string
  total: number
  byStatus: Record<string, number>
  averageRatingAll: number | null
  feedbackCount: number
}

export type ReportRow = {
  id: number
  scheduledAtIso: string
  date: string
  time: string
  status: string
  subject: string
  mentorName: string
  studentName: string
  studentEmail: string
  hasMaterials: boolean
  studentMessage: string
  mentorMessage: string
  preparationItems: string
  ratingStudent: number | null
  ratingMentor: number | null
}

export async function buildMentoriaReport(fromUtc: DateTime, toUtc: DateTime, rangeLabel: { from: string; to: string }) {
  const appointments = await Appointment.query()
    .where('scheduled_at', '>=', fromUtc.toISO()!)
    .where('scheduled_at', '<=', toUtc.toISO()!)
    .preload('mentor')
    .preload('student')
    .preload('materials')
    .preload('feedbacks')
    .orderBy('scheduled_at', 'asc')

  const byStatus: Record<string, number> = {}
  let ratingSum = 0
  let ratingCount = 0

  const rows: ReportRow[] = appointments.map((a) => {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1

    const mentor = a.mentor as User | null
    const student = a.student as User | null
    const studentFeedback = (a.feedbacks ?? []).find((f) => f.userType === 'student')
    const mentorFeedback = (a.feedbacks ?? []).find((f) => f.userType === 'mentor')

    const dt = a.scheduledAt
    const date = dt.toFormat('yyyy-LL-dd')
    const time = a.timeSlot

    if (studentFeedback?.rating != null) {
      ratingSum += studentFeedback.rating
      ratingCount += 1
    }
    if (mentorFeedback?.rating != null) {
      ratingSum += mentorFeedback.rating
      ratingCount += 1
    }

    return {
      id: a.id,
      scheduledAtIso: dt.toISO() ?? '',
      date,
      time,
      status: a.status,
      subject: a.subject,
      mentorName: mentor?.fullName || `Mentor ${a.mentorId}`,
      studentName: a.studentName || student?.fullName || 'Estudante',
      studentEmail: a.studentEmail || student?.email || '',
      hasMaterials: (a.materials?.length ?? 0) > 0,
      studentMessage: a.studentMessage ?? '',
      mentorMessage: a.message ?? '',
      preparationItems: (a.preparationItems ?? []).join('\n'),
      ratingStudent: studentFeedback?.rating ?? null,
      ratingMentor: mentorFeedback?.rating ?? null,
    }
  })

  const summary: ReportSummary = {
    from: rangeLabel.from,
    to: rangeLabel.to,
    total: rows.length,
    byStatus,
    averageRatingAll: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : null,
    feedbackCount: ratingCount,
  }

  return { summary, rows }
}

