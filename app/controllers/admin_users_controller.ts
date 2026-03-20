import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import vine from '@vinejs/vine'

const updateUserSchema = vine.compile(vine.object({
  name: vine.string().trim().minLength(1).optional(),
  email: vine.string().email().optional(),
  phone: vine.string().trim().optional(),
  role: vine.enum(['student', 'mentor', 'admin']).optional(),
  grade: vine.string().trim().optional(),
  specialties: vine.array(vine.string()).optional(),
  status: vine.enum(['active', 'inactive']).optional(),
  password: vine.string().minLength(6).optional(),
}))

export default class AdminUsersController {
  /**
   * GET /api/admin/users
   */
  async index({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const page = Math.max(1, request.input('page', 1))
    const limit = Math.min(100, Math.max(1, request.input('limit', 20)))
    const search = request.input('search', '').trim().toLowerCase()

    let query = User.query().orderBy('created_at', 'desc')
    if (search) {
      query = query.where((q) => {
        q.whereRaw('LOWER(full_name) LIKE ?', [`%${search}%`]).orWhereRaw('LOWER(email) LIKE ?', [`%${search}%`])
      })
    }

    const users = await query.paginate(page, limit)
    const mentorIds = (await db.from('users').select('id').where('role', 'mentor')).map((r: { id: number }) => r.id)
    const studentIds = (await db.from('users').select('id').where('role', 'student')).map((r: { id: number }) => r.id)

    const mentorCounts =
      mentorIds.length > 0
        ? await db
          .from('appointments')
          .whereIn('mentor_id', mentorIds)
          .groupBy('mentor_id')
          .select('mentor_id')
          .count('* as total')
        : []
    const studentCounts =
      studentIds.length > 0
        ? await db
          .from('appointments')
          .whereIn('student_id', studentIds)
          .groupBy('student_id')
          .select('student_id')
          .count('* as total')
        : []

    const mentorCountMap = new Map(mentorCounts.map((r: { mentor_id: number; total: string }) => [r.mentor_id, Number(r.total)]))
    const studentCountMap = new Map(studentCounts.map((r: { student_id: number; total: string }) => [r.student_id, Number(r.total)]))

    const list = users.all().map((u) => ({
      id: String(u.id),
      name: u.fullName || '',
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      grade: u.grade ?? undefined,
      specialties: u.specialties ?? undefined,
      status: u.status,
      createdAt: u.createdAt.toISO(),
      totalMentorias: u.role === 'mentor' ? mentorCountMap.get(u.id) : undefined,
      totalAgendamentos: u.role === 'student' ? studentCountMap.get(u.id) : undefined,
    }))

    return response.ok({
      users: list,
      total: users.total,
      page: users.currentPage,
      limit: users.perPage,
    })
  }

  /**
   * GET /api/admin/users/:id
   */
  async show({ params, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const id = parseInt(params.id, 10)
    const target = await User.find(id)
    if (!target) {
      return response.notFound({ message: 'Usuário não encontrado' })
    }

    let totalMentorias: number | undefined
    let totalAgendamentos: number | undefined
    let averageRating: number | undefined

    if (target.role === 'mentor') {
      const count = await db.from('appointments').where('mentor_id', target.id).count('* as total').first()
      totalMentorias = Number((count as { total: string })?.total ?? 0)
      const avg = await db.from('feedbacks').join('appointments', 'appointments.id', 'feedbacks.appointment_id').where('appointments.mentor_id', target.id).avg('feedbacks.rating as avg').first()
      averageRating = avg ? Number((avg as { avg: string })?.avg) : undefined
    }
    if (target.role === 'student') {
      const count = await db.from('appointments').where('student_id', target.id).count('* as total').first()
      totalAgendamentos = Number((count as { total: string })?.total ?? 0)
    }

    return response.ok({
      id: String(target.id),
      name: target.fullName || '',
      email: target.email,
      phone: target.phone || '',
      role: target.role,
      grade: target.grade ?? undefined,
      specialties: target.specialties ?? undefined,
      status: target.status,
      createdAt: target.createdAt.toISO(),
      updatedAt: target.updatedAt?.toISO(),
      totalMentorias,
      totalAgendamentos,
      averageRating,
    })
  }

  /**
   * PATCH /api/admin/users/:id
   */
  async update({ params, request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const id = parseInt(params.id, 10)
    const target = await User.find(id)
    if (!target) {
      return response.notFound({ message: 'Usuário não encontrado' })
    }

    const data = await request.validateUsing(updateUserSchema)

    if (data.email !== undefined && data.email !== target.email) {
      const existing = await User.findBy('email', data.email)
      if (existing) {
        return response.badRequest({ message: 'E-mail já está em uso por outro usuário' })
      }
      target.email = data.email
    }
    if (data.name !== undefined) target.fullName = data.name
    if (data.phone !== undefined) target.phone = data.phone || null
    if (data.role !== undefined) target.role = data.role
    if (data.grade !== undefined) target.grade = data.grade || null
    if (data.specialties !== undefined) target.specialties = data.specialties.length ? data.specialties : null
    if (data.status !== undefined) target.status = data.status
    if (data.password !== undefined) {
      target.password = await hash.make(data.password)
    }

    await target.save()

    return response.ok({
      id: String(target.id),
      message: 'Usuário atualizado com sucesso',
    })
  }
}
