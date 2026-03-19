import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Marca mentorias confirmadas como concluídas após o fim do slot (30 min após scheduled_at).
 * Executado pelo cron em start/scheduler.ts.
 */
export async function syncAppointmentStatuses(): Promise<number> {
  const updated = await db
    .from('appointments')
    .where('status', 'confirmed')
    .whereRaw(`scheduled_at + interval '30 minutes' < now()`)
    .update({
      status: 'completed',
      updated_at: DateTime.utc().toJSDate(),
    })

  return typeof updated === 'number' ? updated : 0
}
