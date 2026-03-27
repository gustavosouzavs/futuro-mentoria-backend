import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import AppointmentMaterial from '#models/appointment_material'
import Feedback from '#models/feedback'

export default class Appointment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare studentId: number | null

  @column()
  declare mentorId: number

  @column()
  declare subject: string

  @column.dateTime()
  declare scheduledAt: DateTime

  @column()
  declare timeSlot: string

  @column()
  declare status: 'pending' | 'confirmed' | 'completed' | 'cancelled'

  @column()
  declare message: string | null

  /** Texto enviado pelo estudante no agendamento (somente leitura para o mentor). */
  @column()
  declare studentMessage: string | null

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),

  })
  declare preparationItems: string[] | null

  @column()
  declare studentName: string | null

  @column()
  declare studentEmail: string | null

  @column()
  declare studentGrade: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'studentId' })
  declare student: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'mentorId' })
  declare mentor: BelongsTo<typeof User>

  @hasMany(() => AppointmentMaterial, { foreignKey: 'appointmentId' })
  declare materials: HasMany<typeof AppointmentMaterial>

  @hasMany(() => Feedback, { foreignKey: 'appointmentId' })
  declare feedbacks: HasMany<typeof Feedback>
}
