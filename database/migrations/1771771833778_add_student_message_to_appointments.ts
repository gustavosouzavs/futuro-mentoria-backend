import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'appointments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('student_message').nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `UPDATE appointments SET student_message = message WHERE status = ? AND message IS NOT NULL`,
        ['pending']
      )
      await db.rawQuery(
        `UPDATE appointments SET message = NULL WHERE status = ? AND student_message IS NOT NULL`,
        ['pending']
      )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('student_message')
    })
  }
}
