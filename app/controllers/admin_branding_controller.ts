import type { HttpContext } from '@adonisjs/core/http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import BrandingSetting from '#models/branding_setting'
import { storeBrandingLogo } from '#services/branding_logo_file_service'

function ensureAdmin(user: { role: string } | null) {
  if (!user || user.role !== 'admin') {
    throw new Error('Acesso negado')
  }
}

export default class AdminBrandingController {
  /**
   * GET /api/admin/branding
   */
  async show({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user
    if (!user || user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const setting = (await BrandingSetting.find(1)) || (await BrandingSetting.create({ id: 1 }))
    return response.ok({
      hasLogo: !!setting.logoDiskPath,
      logoUrl: setting.logoDiskPath ? '/api/admin/branding/logo' : null,
      updatedAt: setting.updatedAt?.toISO() ?? null,
    })
  }

  /**
   * POST /api/admin/branding/logo
   * multipart field: file
   */
  async uploadLogo({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user
    if (!user || user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const file = request.file('file', { size: '3mb' })
    if (!file) {
      return response.badRequest({ message: 'Envie uma imagem no campo "file".' })
    }

    try {
      ensureAdmin(user)
      const { diskPath } = await storeBrandingLogo(file)
      const setting = (await BrandingSetting.find(1)) || (await BrandingSetting.create({ id: 1 }))
      setting.logoDiskPath = diskPath
      await setting.save()

      return response.ok({
        message: 'Logo atualizada com sucesso',
        logoUrl: '/api/admin/branding/logo',
        updatedAt: setting.updatedAt?.toISO() ?? null,
      })
    } catch (e) {
      return response.badRequest({ message: e instanceof Error ? e.message : 'Erro ao salvar logo.' })
    }
  }

  /**
   * GET /api/admin/branding/logo
   * Stream da logo (apenas admin).
   */
  async logo({ response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user
    if (!user || user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const setting = await BrandingSetting.find(1)
    if (!setting?.logoDiskPath) {
      return response.notFound({ message: 'Logo não configurada' })
    }

    const absPath = app.makePath('storage', setting.logoDiskPath)
    try {
      await stat(absPath)
    } catch {
      return response.notFound({ message: 'Logo não encontrada no servidor' })
    }

    // Evita forçar JSON aqui; é stream.
    response.header('Content-Disposition', `inline; filename=\"logo\"`)
    // tipo pelo extension; suficiente para png/jpg/webp
    const ext = setting.logoDiskPath.split('.').pop()?.toLowerCase()
    if (ext === 'png') response.type('image/png')
    else if (ext === 'webp') response.type('image/webp')
    else response.type('image/jpeg')
    return response.stream(createReadStream(absPath))
  }
}

