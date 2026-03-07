import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'feedbacks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('appointment_id').unsigned().notNullable().references('id').inTable('appointments').onDelete('CASCADE')
      table.string('user_type', 20).notNullable() // student | mentor
      table.integer('rating').unsigned().nullable() // 1-5
      table.text('comment').nullable()
      table.string('satisfaction', 30).nullable() // very_satisfied | satisfied | neutral | dissatisfied | very_dissatisfied
      table.jsonb('topics').nullable() // string[]
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
