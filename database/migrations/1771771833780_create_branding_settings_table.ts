import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'branding_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('logo_disk_path', 512).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.defer(async (db) => {
      await db.table(this.tableName).insert({ id: 1, logo_disk_path: null, created_at: db.raw('CURRENT_TIMESTAMP') })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

