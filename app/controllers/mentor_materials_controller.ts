import type { HttpContext } from '@adonisjs/core/http'
import Appointment from '#models/appointment'
import AppointmentMaterial from '#models/appointment_material'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const createMaterialSchema = vine.object({
  name: vine.string().trim().minLength(1),
  url: vine.string().trim(),
  type: vine.enum(['pdf', 'doc', 'link', 'other']),
})

export default class MentorMaterialsController {
  /**
   * POST /api/mentor/appointments/:id/materials
   */
  async store({ params, request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'mentor') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const appointmentId = parseInt(params.id, 10)
    const appointment = await Appointment.query().where('id', appointmentId).where('mentor_id', user.id).first()

    if (!appointment) {
      return response.notFound({ message: 'Agendamento não encontrado' })
    }

    const data = await request.validateUsing(createMaterialSchema)
    const material = await AppointmentMaterial.create({
      appointmentId: appointment.id,
      name: data.name,
      url: data.url,
      type: data.type,
      uploadedAt: DateTime.now(),
    })

    return response.created({
      id: String(material.id),
      name: material.name,
      url: material.url,
      type: material.type,
      uploadedAt: material.uploadedAt.toISO(),
    })
  }
}
