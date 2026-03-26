import type { HttpContext } from '@adonisjs/core/http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import AppointmentMaterial from '#models/appointment_material'

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  txt: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

function mimeForMaterial(material: AppointmentMaterial): string {
  const fromUrl = material.url.match(/\.([a-z0-9]+)$/i)
  const ext = fromUrl?.[1]?.toLowerCase() ?? (material.type === 'pdf' ? 'pdf' : '')
  return (ext && EXT_MIME[ext]) || 'application/octet-stream'
}

export default class MaterialFilesController {
  /**
   * GET /api/material-files/:id
   * Stream arquivo salvo no disco (autenticado; mentor ou estudante da mentoria, ou admin).
   */
  async show({ params, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!

    const id = parseInt(params.id, 10)
    if (Number.isNaN(id)) {
      return response.badRequest({ message: 'Material inválido' })
    }

    const material = await AppointmentMaterial.query().where('id', id).preload('appointment').first()

    if (!material?.diskPath) {
      return response.notFound({ message: 'Arquivo não encontrado' })
    }

    const appt = material.appointment
    if (!appt) {
      return response.notFound({ message: 'Mentoria não encontrada' })
    }

    const allowed =
      (user.role === 'mentor' && appt.mentorId === user.id) ||
      (user.role === 'student' && appt.studentId != null && appt.studentId === user.id) ||
      user.role === 'admin'

    if (!allowed) {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const absPath = app.makePath('storage', material.diskPath)
    try {
      await stat(absPath)
    } catch {
      return response.notFound({ message: 'Arquivo não encontrado no servidor' })
    }

    const safeName =
      material.name.replace(/[^\w.\- \u00C0-\u024F]+/g, '_').trim().slice(0, 180) || 'arquivo'

    response.header('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`)
    response.type(mimeForMaterial(material))
    return response.stream(createReadStream(absPath))
  }
}
