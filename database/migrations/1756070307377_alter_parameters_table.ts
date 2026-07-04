import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'parameters'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('si_unit_id').references('id').inTable('units').nullable()
      table.integer('conversion_factor').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('si_unit_id')
      table.dropColumn('conversion_factor')
    })
  }
}
