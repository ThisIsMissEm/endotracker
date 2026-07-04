import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'units'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_international_system').defaultTo(false).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_international_system')
    })
  }
}
