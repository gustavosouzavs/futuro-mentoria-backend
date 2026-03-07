import type { HttpContext } from '@adonisjs/core/http'
import Room from '#models/room'
import vine from '@vinejs/vine'

const createRoomSchema = vine.object({
  name: vine.string().trim().minLength(1).maxLength(120),
  code: vine.string().trim().maxLength(30).optional(),
  location: vine.string().trim().maxLength(255).optional(),
})

const updateRoomSchema = vine.object({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  code: vine.string().trim().maxLength(30).optional(),
  location: vine.string().trim().maxLength(255).optional(),
})

export default class AdminRoomsController {
  async index({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const rooms = await Room.query().orderBy('name')
    return response.ok({
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        location: r.location,
        createdAt: r.createdAt.toISO(),
      })),
    })
  }

  async store({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const data = await request.validateUsing(createRoomSchema)
    if (data.code) {
      const existing = await Room.findBy('code', data.code)
      if (existing) {
        return response.badRequest({ message: 'Já existe uma sala com este código.' })
      }
    }
    const room = await Room.create({
      name: data.name,
      code: data.code ?? null,
      location: data.location ?? null,
    })
    return response.created({
      id: room.id,
      name: room.name,
      code: room.code,
      location: room.location,
    })
  }

  async update({ params, request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const id = parseInt(params.id, 10)
    const room = await Room.find(id)
    if (!room) return response.notFound({ message: 'Sala não encontrada' })
    const data = await request.validateUsing(updateRoomSchema)
    if (data.code !== undefined) {
      if (data.code) {
        const existing = await Room.query().where('code', data.code).whereNot('id', id).first()
        if (existing) return response.badRequest({ message: 'Já existe outra sala com este código.' })
      }
      room.code = data.code || null
    }
    if (data.name !== undefined) room.name = data.name
    if (data.location !== undefined) room.location = data.location || null
    await room.save()
    return response.ok({
      id: room.id,
      name: room.name,
      code: room.code,
      location: room.location,
    })
  }

  async destroy({ params, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }
    const id = parseInt(params.id, 10)
    const room = await Room.find(id)
    if (!room) return response.notFound({ message: 'Sala não encontrada' })
    await room.delete()
    return response.ok({ message: 'Sala removida' })
  }
}
