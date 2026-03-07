import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import vine from '@vinejs/vine'

const loginSchema = vine.compile(vine.object({
  email: vine.string().email(),
  password: vine.string(),
}))

const registerSchema = vine.compile(vine.object({
  name: vine.string().trim().minLength(2),
  email: vine.string().email(),
  password: vine.string().minLength(6),
  phone: vine.string().trim().optional(),
  role: vine.enum(['student', 'mentor']),
  grade: vine.string().trim().optional(),
  specialties: vine.array(vine.string()).optional(),
}))

export default class AuthController {
  async login({ request, response, auth }: HttpContext) {
    const { email, password } = await request.validateUsing(loginSchema)
    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      return response.ok({
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      })
    } catch {
      return response.unauthorized({ message: 'Credenciais inválidas' })
    }
  }

  async register({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(registerSchema)
    const existing = await User.findBy('email', data.email)
    if (existing) {
      return response.badRequest({ message: 'E-mail já cadastrado' })
    }
    const user = await User.create({
      fullName: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone ?? null,
      grade: data.grade ?? null,
      specialties: data.specialties ?? null,
      status: 'active',
    })
    await auth.use('web').login(user)
    return response.created({
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    })
  }

  async logout({ response, auth }: HttpContext) {
    await auth.use('web').logout()
    return response.ok({ message: 'Logout realizado' })
  }

  async me({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    return response.ok({
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone,
        grade: user.grade,
        specialties: user.specialties,
      },
    })
  }
}
