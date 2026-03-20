import type { HttpContext } from '@adonisjs/core/http'
import fs from 'node:fs/promises'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import { parseStudentImportFile } from '#services/student_import_service'

function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
}

/**
 * POST /api/admin/students/import
 * Multipart: file (CSV or XLSX with columns Aluno, Série; optional Email)
 */
export default class AdminStudentsImportController {
  async store({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Acesso negado' })
    }

    const file = request.file('file')
    if (!file) {
      return response.badRequest({ message: 'Nenhum arquivo enviado. Use o campo "file".' })
    }

    const ext = file.extname?.toLowerCase()
    if (ext && ext !== '.csv' && ext !== '.xlsx' && ext !== '.xls') {
      return response.badRequest({
        message: 'Formato não suportado. Use .csv ou .xlsx',
      })
    }

    if (!file.tmpPath) {
      return response.badRequest({ message: 'Arquivo não disponível (tmpPath).' })
    }
    const buffer = await fs.readFile(file.tmpPath)
    const { rows, errors } = parseStudentImportFile(
      buffer,
      file.type,
      file.clientName
    )

    if (errors.length > 0) {
      return response.badRequest({ message: 'Erro no arquivo', errors })
    }

    const created: { id: number; name: string; email: string }[] = []
    const skipped: { row: number; reason: string }[] = []
    const defaultPassword = 'trocar123'

    for (let i = 0; i < rows.length; i++) {
      const { aluno, serie, email: rowEmail } = rows[i]
      const email = rowEmail?.trim() || `${slug(aluno) || 'aluno'}.${Date.now()}.${i}@importado.local`

      const existing = await User.findBy('email', email)
      if (existing) {
        skipped.push({ row: i + 2, reason: `E-mail já existe: ${email}` })
        continue
      }

      try {
        const newUser = await User.create({
          fullName: aluno,
          email,
          password: defaultPassword,
          role: 'student',
          grade: serie || null,
          status: 'active',
        })
        created.push({
          id: newUser.id,
          name: newUser.fullName || aluno,
          email: newUser.email,
        })
      } catch (e) {
        skipped.push({
          row: i + 2,
          reason: e instanceof Error ? e.message : 'Erro ao criar usuário',
        })
      }
    }

    return response.ok({
      message: `Importação concluída. ${created.length} aluno(s) criado(s).`,
      created: created.length,
      skipped: skipped.length,
      details: { created, skipped },
    })
  }
}
