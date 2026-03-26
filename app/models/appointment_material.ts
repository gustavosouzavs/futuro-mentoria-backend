import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Appointment from '#models/appointment'

export default class AppointmentMaterial extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare appointmentId: number

  @column()
  declare name: string

  @column()
  declare url: string

  @column()
  declare type: 'pdf' | 'doc' | 'link' | 'other'

  /** Caminho relativo dentro de storage/ quando o arquivo está no servidor; null = apenas URL externa. */
  @column()
  declare diskPath: string | null

  @column()
  declare source: 'mentor' | 'student'

  @column.dateTime()
  declare uploadedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Appointment, { foreignKey: 'appointmentId' })
  declare appointment: BelongsTo<typeof Appointment>
}
