import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'parameters'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('show_on_dashboard').defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('show_on_dashboard')
    })
  }
}
