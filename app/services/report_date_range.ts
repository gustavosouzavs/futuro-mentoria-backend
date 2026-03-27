import { DateTime } from 'luxon'

export function parseReportDate(value: string | undefined, fieldName: string): string {
  const v = (value ?? '').trim()
  if (!v) throw new Error(`Campo "${fieldName}" é obrigatório.`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`Campo "${fieldName}" deve estar em YYYY-MM-DD.`)
  return v
}

export function toUtcRange(fromDate: string, toDate: string): { from: DateTime; to: DateTime } {
  const from = DateTime.fromISO(`${fromDate}T00:00:00.000Z`, { zone: 'utc' })
  const to = DateTime.fromISO(`${toDate}T23:59:59.999Z`, { zone: 'utc' })
  if (!from.isValid || !to.isValid) throw new Error('Datas inválidas.')
  if (from > to) throw new Error('Data inicial não pode ser maior que data final.')
  return { from, to }
}

