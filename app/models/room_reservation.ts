import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Room from '#models/room'
import User from '#models/user'

export default class RoomReservation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare roomId: number

  @column()
  declare mentorId: number

  @column.date()
  declare date: DateTime

  @column()
  declare reservedUntil: string | null // HH:mm

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Room, { foreignKey: 'roomId' })
  declare room: BelongsTo<typeof Room>

  @belongsTo(() => User, { foreignKey: 'mentorId' })
  declare mentor: BelongsTo<typeof User>
}
