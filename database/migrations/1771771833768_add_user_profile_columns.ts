import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('role', 20).defaultTo('student') // student | mentor | admin
      table.string('phone', 30).nullable()
      table.string('grade', 80).nullable() // for students
      table.jsonb('specialties').nullable() // for mentors: string[]
      table.string('status', 20).defaultTo('active') // active | inactive
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('role')
      table.dropColumn('phone')
      table.dropColumn('grade')
      table.dropColumn('specialties')
      table.dropColumn('status')
    })
  }
}
