import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import * as XLSX from 'xlsx'
import BrandingSetting from '#models/branding_setting'
import { buildMentoriaReport } from '#services/admin_mentoria_report_service'
import { parseReportDate, toUtcRange } from '#services/report_date_range'
import { renderMentoriaPdf } from '#services/pdf_report_writer'

function ensureAdmin(ctx: HttpContext) {
  const user = ctx.auth.user
  if (!user || user.role !== 'admin') {
    throw new Error('Acesso negado')
  }
}

function fileNameSafe(s: string): string {
  return s.replace(/[^\w.\-]+/g, '_').slice(0, 140)
}

export default class AdminReportsController {
  /**
   * GET /api/admin/reports/mentorias.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async mentoriasXlsx({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user
    if (!user || user.role !== 'admin') return response.forbidden({ message: 'Acesso negado' })

    try {
      ensureAdmin({ request, response, auth } as unknown as HttpContext)
      const from = parseReportDate(request.qs().from, 'from')
      const to = parseReportDate(request.qs().to, 'to')
      const { from: fromUtc, to: toUtc } = toUtcRange(from, to)

      const { summary, rows } = await buildMentoriaReport(fromUtc, toUtc, { from, to })

      const sheetResumo = XLSX.utils.json_to_sheet([
        { Campo: 'Período (from)', Valor: summary.from },
        { Campo: 'Período (to)', Valor: summary.to },
        { Campo: 'Total mentorias', Valor: summary.total },
        { Campo: 'Feedbacks contabilizados', Valor: summary.feedbackCount },
        { Campo: 'Média de notas (geral)', Valor: summary.averageRatingAll ?? '' },
        ...Object.entries(summary.byStatus).map(([k, v]) => ({ Campo: `Status: ${k}`, Valor: v })),
      ])

      const sheetMentorias = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          ID: r.id,
          Data: r.date,
          Hora: r.time,
          Status: r.status,
          Area: r.subject,
          Mentor: r.mentorName,
          Estudante: r.studentName,
          EmailEstudante: r.studentEmail,
          TemMateriais: r.hasMaterials ? 'Sim' : 'Não',
          MensagemEstudante: r.studentMessage,
          MensagemMentor: r.mentorMessage,
          Preparacao: r.preparationItems,
          NotaEstudante: r.ratingStudent ?? '',
          NotaMentor: r.ratingMentor ?? '',
          ScheduledAtISO: r.scheduledAtIso,
        }))
      )

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheetResumo, 'Resumo')
      XLSX.utils.book_append_sheet(wb, sheetMentorias, 'Mentorias')

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

      response.header(
        'Content-Disposition',
        `attachment; filename="${fileNameSafe(`relatorio-mentorias-${from}-a-${to}.xlsx`)}"`
      )
      response.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      return response.send(buffer)
    } catch (e) {
      return response.badRequest({ message: e instanceof Error ? e.message : 'Erro ao gerar relatório.' })
    }
  }

  /**
   * GET /api/admin/reports/mentorias.pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async mentoriasPdf({ request, response, auth }: HttpContext) {
    await auth.use('web').authenticate()
    const user = auth.user
    if (!user || user.role !== 'admin') return response.forbidden({ message: 'Acesso negado' })

    try {
      const from = parseReportDate(request.qs().from, 'from')
      const to = parseReportDate(request.qs().to, 'to')
      const { from: fromUtc, to: toUtc } = toUtcRange(from, to)

      const { summary, rows } = await buildMentoriaReport(fromUtc, toUtc, { from, to })

      const branding = await BrandingSetting.find(1)
      let logoBuffer: Buffer | undefined
      if (branding?.logoDiskPath) {
        try {
          const abs = app.makePath('storage', branding.logoDiskPath)
          logoBuffer = await readFile(abs)
        } catch {
          logoBuffer = undefined
        }
      }

      const establishmentName = 'Futuro Mentoria'
      const pdf = await renderMentoriaPdf({ establishmentName, logoBuffer, summary, rows })

      response.header(
        'Content-Disposition',
        `attachment; filename="${fileNameSafe(`relatorio-mentorias-${from}-a-${to}.pdf`)}"`
      )
      response.type('application/pdf')
      return response.send(pdf)
    } catch (e) {
      return response.badRequest({ message: e instanceof Error ? e.message : 'Erro ao gerar relatório.' })
    }
  }
}

