import ScheduleConfig from '#models/schedule_config'
import { DateTime } from 'luxon'

export type ScheduleDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

function dayKeyFromWeekday(weekday: number): ScheduleDayKey | null {
  // Luxon: Monday = 1 ... Sunday = 7
  switch (weekday) {
    case 1:
      return 'monday'
    case 2:
      return 'tuesday'
    case 3:
      return 'wednesday'
    case 4:
      return 'thursday'
    case 5:
      return 'friday'
    default:
      return null
  }
}

export function dayKeyFromISODate(dateOnly: string): ScheduleDayKey | null {
  // dateOnly: YYYY-MM-DD
  const dt = DateTime.fromISO(dateOnly, { zone: 'utc' })
  return dayKeyFromWeekday(dt.weekday)
}

/**
 * Retorna:
 * - `null` quando NÃO existe config (ou dia não reconhecido), então permite tudo (comportamento atual)
 * - `[]` quando o dia está desativado
 * - lista de `time` permitidos quando o dia está ativo
 */
export function getAllowedTimeSlotsForDate(
  scheduleConfig: ScheduleConfig | null,
  dateOnly: string
): string[] | null {
  if (!scheduleConfig) return null

  const dayKey = dayKeyFromISODate(dateOnly)
  if (!dayKey) return null

  const dayCfg = scheduleConfig.days?.find((d) => d.day === dayKey)
  if (!dayCfg) return null

  if (!dayCfg.enabled) return []

  return (dayCfg.timeSlots ?? []).filter((s) => s.enabled).map((s) => s.time)
}

