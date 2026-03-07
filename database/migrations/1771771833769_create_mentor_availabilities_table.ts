import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mentor_availabilities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('mentor_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('date').notNullable()
      table.string('time', 5).notNullable() // HH:mm
      table.string('status', 20).defaultTo('available') // available | booked | unavailable
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['mentor_id', 'date', 'time'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
