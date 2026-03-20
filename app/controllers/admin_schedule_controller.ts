import type { HttpContext } from '@adonisjs/core/http'
import ScheduleConfig from '#models/schedule_config'
import vine from '@vinejs/vine'

const scheduleSchema = vine.compile(vine.object({
  days: vine.array(
    vine.object({
      day: vine.string(),
      enabled: vine.boolean(),
      timeSlots: vine.array(
        vine.object({
          id: vine.string(),
          time: vine.string(),
          enabled: vine.boolean(),
        })
      ),
    })
  ),
}))

export default class AdminScheduleController {
  /**
   * GET /api/admin/schedule-config
   */
  async index({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }


    const existing = await ScheduleConfig.first()
    return response.ok({ days: existing?.days ?? [] })
  }

  /**
   * POST /api/admin/schedule-config
   */
  async store({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const data = await request.validateUsing(scheduleSchema)
    const existing = await ScheduleConfig.first()
    if (existing) {
      existing.days = data.days
      await existing.save()
      return response.ok({ message: 'Configuração atualizada', config: existing })
    }
    const config = await ScheduleConfig.create({ days: data.days })
    return response.created({ message: 'Configuração criada', config })
  }
}
