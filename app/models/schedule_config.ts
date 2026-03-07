import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ScheduleConfig extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({
    prepare: (value: object) => JSON.stringify(value),
    consume: (value: string) => (value ? JSON.parse(value) : []),
  })
  declare days: { day: string; enabled: boolean; timeSlots: { id: string; time: string; enabled: boolean }[] }[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
