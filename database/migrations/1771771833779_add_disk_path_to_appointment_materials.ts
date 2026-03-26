import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'appointment_materials'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('disk_path', 512).nullable()
      table.string('source', 20).notNullable().defaultTo('mentor')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('disk_path')
      table.dropColumn('source')
    })
  }
}
