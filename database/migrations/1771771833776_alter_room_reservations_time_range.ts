import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'room_reservations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('reserved_from', 5).nullable()
      table.dropUnique(['room_id', 'date'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('reserved_from')
      // Só recria unique se não houver duplicatas (room_id, date)
      table.unique(['room_id', 'date'])
    })
  }
}
