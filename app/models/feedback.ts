import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Appointment from '#models/appointment'

export default class Feedback extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare appointmentId: number

  @column()
  declare userType: 'student' | 'mentor'

  @column()
  declare rating: number | null

  @column()
  declare comment: string | null

  @column()
  declare satisfaction: string | null

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare topics: string[] | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Appointment, { foreignKey: 'appointmentId' })
  declare appointment: BelongsTo<typeof Appointment>
}
