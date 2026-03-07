import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'room_reservations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('room_id').unsigned().notNullable().references('id').inTable('rooms').onDelete('CASCADE')
      table.integer('mentor_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('date').notNullable()
      table.string('reserved_until', 5).nullable() // HH:mm - até qual horário a sala está reservada
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['room_id', 'date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
