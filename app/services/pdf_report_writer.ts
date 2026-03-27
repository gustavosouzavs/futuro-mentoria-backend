import PDFDocument from 'pdfkit'
import type { ReportRow, ReportSummary } from '#services/admin_mentoria_report_service'
import { format } from 'date-fns'

function textOrDash(v: string | null | undefined): string {
  const t = (v ?? '').trim()
  return t ? t : '—'
}

function compactObs(row: ReportRow): string {
  const parts: string[] = []
  const s = (row.studentMessage ?? '').trim()
  const m = (row.mentorMessage ?? '').trim()
  const p = (row.preparationItems ?? '').trim()
  if (s) parts.push(`E: ${s}`)
  if (m) parts.push(`M: ${m}`)
  if (p) parts.push(`Prep: ${p}`)
  return parts.join(' | ')
}

export async function renderMentoriaPdf(params: {
  establishmentName: string
  logoBuffer?: Buffer
  summary: ReportSummary
  rows: ReportRow[]
}): Promise<Buffer> {
  // Paisagem (horizontal) para caber mais colunas sem cortar.
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Uint8Array) => chunks.push(Buffer.from(c)))

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  // Header
  const startY = doc.y
  if (params.logoBuffer) {
    try {
      // Logo acima para liberar largura da tabela
      doc.image(params.logoBuffer, doc.x, startY, { fit: [160, 60] })
      doc.moveDown(5)
    } catch {
      // ignore logo errors; report still generated
    }
  }
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(params.establishmentName)
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#444444')
    .text(`Relatório de mentorias • Período ${params.summary.from} → ${params.summary.to}`, {
      continued: false,
    })
  doc.moveDown(1)
  doc.fillColor('#000000')

  // Summary cards (simple)
  doc.font('Helvetica-Bold').fontSize(12).text('Resumo')
  doc.moveDown(0.5)
  doc.font('Helvetica').fontSize(10)
  doc.text(`Total de mentorias: ${params.summary.total}`)
  doc.text(`Feedbacks contabilizados: ${params.summary.feedbackCount}`)
  doc.text(`Média de notas (geral): ${params.summary.averageRatingAll ?? '—'}`)
  doc.moveDown(0.25)
  doc.text(
    `Por status: ${Object.entries(params.summary.byStatus)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' • ') || '—'}`
  )
  doc.moveDown(1)

  doc.font('Helvetica-Bold').fontSize(12).text('Mentorias (detalhado)')
  doc.moveDown(0.5)
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#444444')
    .text('Legenda: Mat = tem materiais (S/N) • NE = nota do estudante • NM = nota do mentor • Obs = observações')
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#666666')
    .text('Obs: E = mensagem do estudante • M = mensagem do mentor • Prep = itens de preparação')
  doc.moveDown(0.6)
  doc.fillColor('#000000')

  // Table
  // Colunas no mínimo possível (compactas), com truncamento/reticências.
  const colWidths = {
    when: 82,
    status: 58,
    subject: 78,
    mentor: 120,
    student: 130,
    materials: 34,
    ratingStudent: 34,
    ratingMentor: 34,
    obs: 0, // calculada pelo espaço restante
  }
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const x0 = doc.x
  const yHeader = doc.y

  const cols = [
    { key: 'when', label: 'Data/Hora', width: colWidths.when },
    { key: 'status', label: 'Status', width: colWidths.status },
    { key: 'subject', label: 'Área', width: colWidths.subject },
    { key: 'mentor', label: 'Mentor', width: colWidths.mentor },
    { key: 'student', label: 'Estudante', width: colWidths.student },
    { key: 'materials', label: 'Mat', width: colWidths.materials },
    { key: 'ratingStudent', label: 'NE', width: colWidths.ratingStudent },
    { key: 'ratingMentor', label: 'NM', width: colWidths.ratingMentor },
    {
      key: 'obs',
      label: 'Obs',
      width: Math.max(
        120,
        pageWidth -
        (colWidths.when +
          colWidths.status +
          colWidths.subject +
          colWidths.mentor +
          colWidths.student +
          colWidths.materials +
          colWidths.ratingStudent +
          colWidths.ratingMentor)
      ),
    },
  ] as const

  function drawRow(values: Record<string, string>, y: number, isHeader = false) {
    let x = x0
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 8.5 : 8)
    for (const c of cols) {
      doc.text(values[c.key], x, y, { width: c.width, ellipsis: true })
      x += c.width
    }
  }

  drawRow(
    {
      when: 'Data/Hora',
      status: 'Status',
      subject: 'Área',
      mentor: 'Mentor',
      student: 'Estudante',
      materials: 'Mat',
      ratingStudent: 'NE',
      ratingMentor: 'NM',
      obs: 'Obs',
    },
    yHeader,
    true
  )
  doc.moveDown(0.8)
  doc
    .moveTo(x0, doc.y)
    .lineTo(x0 + pageWidth, doc.y)
    .strokeColor('#DDDDDD')
    .stroke()
  doc.moveDown(0.5)

  for (const r of params.rows) {
    const y = doc.y
    const rowHeight = 14
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
      drawRow(
        {
          when: 'Data/Hora',
          status: 'Status',
          subject: 'Área',
          mentor: 'Mentor',
          student: 'Estudante',
          materials: 'Mat',
          ratingStudent: 'NE',
          ratingMentor: 'NM',
          obs: 'Obs',
        },
        doc.y,
        true
      )
      doc.moveDown(0.8)
      doc
        .moveTo(x0, doc.y)
        .lineTo(x0 + pageWidth, doc.y)
        .strokeColor('#DDDDDD')
        .stroke()
      doc.moveDown(0.5)
    }

    drawRow(
      {
        when: `${format(new Date(r.date), 'dd/MM/yyyy')} ${r.time}`,
        status: textOrDash(r.status),
        subject: textOrDash(r.subject),
        mentor: textOrDash(r.mentorName),
        student: textOrDash(r.studentName),
        materials: r.hasMaterials ? 'S' : 'N',
        ratingStudent: r.ratingStudent != null ? String(r.ratingStudent) : '—',
        ratingMentor: r.ratingMentor != null ? String(r.ratingMentor) : '—',
        obs: textOrDash(compactObs(r)),
      },
      doc.y
    )
    doc.moveDown(0.8)
  }

  doc.end()
  return done
}

