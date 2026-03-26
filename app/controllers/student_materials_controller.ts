import type { HttpContext } from '@adonisjs/core/http'
import Appointment from '#models/appointment'
import AppointmentMaterial from '#models/appointment_material'
import { DateTime } from 'luxon'
import { serializeAppointmentMaterial } from '#services/appointment_material_serializer'
import { storeMaterialMultipart } from '#services/appointment_material_file_service'

export default class StudentMaterialsController {
  /**
   * POST /api/student/appointments/:id/materials/upload
   * multipart field: file
   */
  async store({ params, request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'student') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const appointmentId = parseInt(params.id, 10)
    const appointment = await Appointment.query()
      .where('id', appointmentId)
      .where('student_id', user.id)
      .first()

    if (!appointment) {
      return response.notFound({ message: 'Agendamento não encontrado' })
    }

    const file = request.file('file', { size: '20mb' })
    if (!file) {
      return response.badRequest({ message: 'Envie um arquivo no campo "file".' })
    }

    let diskMeta: Awaited<ReturnType<typeof storeMaterialMultipart>>
    try {
      diskMeta = await storeMaterialMultipart(file, appointment.id)
    } catch (e) {
      return response.badRequest({
        message: e instanceof Error ? e.message : 'Erro ao processar arquivo.',
      })
    }

    const material = await AppointmentMaterial.create({
      appointmentId: appointment.id,
      name: diskMeta.displayName.slice(0, 255),
      url: '/api/material-files/pending',
      type: diskMeta.materialType,
      diskPath: diskMeta.diskPath,
      source: 'student',
      uploadedAt: DateTime.now(),
    })
    material.url = `/api/material-files/${material.id}`
    await material.save()

    return response.created(serializeAppointmentMaterial(material))
  }
}
