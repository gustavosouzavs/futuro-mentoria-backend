import * as XLSX from 'xlsx'

export interface StudentImportRow {
  aluno: string
  serie: string
  email?: string
}

const NORMALIZED_HEADERS: Record<string, string> = {
  aluno: 'aluno',
  'nome': 'aluno',
  'nome do aluno': 'aluno',
  'estudante': 'aluno',
  serie: 'serie',
  'série': 'serie',
  'seria': 'serie',
  'ano': 'serie',
  'grade': 'serie',
  email: 'email',
  'e-mail': 'email',
  'email do aluno': 'email',
}

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/\s+/g, ' ')
  return NORMALIZED_HEADERS[key] ?? key
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value).trim()
  return String(value).trim()
}

/**
 * Parse CSV or XLSX file buffer and return rows with Aluno, Série (and optional Email).
 * Accepts columns: Aluno (or Nome, Estudante), Série (or Séria, Ano, Grade), Email (optional).
 */
export function parseStudentImportFile(
  buffer: Buffer,
  mimeType?: string,
  fileName?: string
): { rows: StudentImportRow[]; errors: string[] } {
  const errors: string[] = []
  const rows: StudentImportRow[] = []

  try {
    const isXlsxMagic = buffer.length >= 4 && buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    const isCsv =
      fileName?.toLowerCase().endsWith('.csv') ||
      mimeType === 'text/csv' ||
      (!isXlsxMagic && buffer.slice(0, 500).toString('utf-8').includes(','))

    const workbook = isCsv
      ? XLSX.read(buffer.toString('utf-8'), { type: 'string', raw: false })
      : XLSX.read(buffer, { type: 'buffer', raw: false })

    const firstSheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheetName]
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    }) as unknown[][]

    if (!data.length) {
      errors.push('Arquivo vazio ou sem linhas de dados.')
      return { rows, errors }
    }

    const headerRow = data[0] as unknown[]
    const colMap: Record<string, number> = {}
    headerRow.forEach((cell, index) => {
      const key = normalizeHeader(normalizeCell(cell))
      if (key) colMap[key] = index
    })

    if (!colMap['aluno']) {
      errors.push('Coluna "Aluno" (ou Nome/Estudante) não encontrada. Cabeçalhos: ' + headerRow.map(String).join(', '))
      return { rows, errors }
    }
    if (!colMap['serie']) {
      errors.push('Coluna "Série" (ou Ano/Grade) não encontrada. Cabeçalhos: ' + headerRow.map(String).join(', '))
      return { rows, errors }
    }

    const emailCol = colMap['email'] !== undefined ? colMap['email'] : -1
    const alunoCol = colMap['aluno']
    const serieCol = colMap['serie']

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[]
      const aluno = normalizeCell(row[alunoCol])
      const serie = normalizeCell(row[serieCol])
      const email = emailCol >= 0 ? normalizeCell(row[emailCol]) : undefined

      if (!aluno) continue
      rows.push({
        aluno,
        serie: serie || '',
        email: email || undefined,
      })
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'Erro ao ler o arquivo.')
  }

  return { rows, errors }
}
