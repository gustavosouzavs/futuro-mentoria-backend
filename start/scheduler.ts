import cron from 'node-cron'
import logger from '@adonisjs/core/services/logger'
import { syncAppointmentStatuses } from '#services/appointment_status_sync_service'

/**
 * Atualiza status das mentorias (confirmada → concluída após o horário).
 * Roda a cada hora e uma vez na subida do servidor.
 */
cron.schedule(
  '0 * * * *',
  () => {
    void syncAppointmentStatuses()
      .then((n) => {
        if (n > 0) {
          logger.info({ count: n }, 'Cron: mentorias marcadas como concluídas')
        }
      })
      .catch((err) => logger.error({ err }, 'Cron: falha ao sincronizar status das mentorias'))
  },
  { timezone: 'America/Sao_Paulo' }
)

void syncAppointmentStatuses().catch((err) =>
  logger.error({ err }, 'Falha na sincronização inicial de status das mentorias')
)
