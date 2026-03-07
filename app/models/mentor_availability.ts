import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class MentorAvailability extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare mentorId: number

  @column.date()
  declare date: DateTime

  @column()
  declare time: string

  @column()
  declare status: 'available' | 'booked' | 'unavailable'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'mentorId' })
  declare mentor: BelongsTo<typeof User>
}
