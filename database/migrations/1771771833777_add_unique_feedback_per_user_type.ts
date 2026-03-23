import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'feedbacks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['appointment_id', 'user_type'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['appointment_id', 'user_type'])
    })
  }
}

