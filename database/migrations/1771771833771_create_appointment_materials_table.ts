import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'appointment_materials'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('appointment_id').unsigned().notNullable().references('id').inTable('appointments').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.string('url', 2048).notNullable()
      table.string('type', 20).defaultTo('other') // pdf | doc | link | other
      table.timestamp('uploaded_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
