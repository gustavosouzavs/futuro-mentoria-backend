import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'appointments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('student_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      table.integer('mentor_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('subject', 255).notNullable() // ENEM area
      table.dateTime('scheduled_at').notNullable() // date + time combined
      table.string('time_slot', 5).notNullable() // HH:mm
      table.string('status', 20).defaultTo('pending') // pending | confirmed | completed | cancelled
      table.text('message').nullable() // mentor message to student
      table.jsonb('preparation_items').nullable() // string[]
      table.string('student_name', 255).nullable() // snapshot for guest bookings
      table.string('student_email', 254).nullable()
      table.string('student_grade', 80).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
