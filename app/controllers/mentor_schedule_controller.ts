import type { HttpContext } from '@adonisjs/core/http'
import ScheduleConfig from '#models/schedule_config'

export default class MentorScheduleController {
  /**
   * GET /api/mentor/schedule-config
   * Retorna a configuração de horários (dias + timeSlots) que o admin bloqueou/permitiu.
   */
  async index({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!

    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const config = await ScheduleConfig.first()
    return response.ok({ days: config?.days ?? [] })
  }
}

