import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'parameters'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Stored scaled by 1000, matching reference_minimum/maximum and
      // optimal_value: the offset is expressed in the recorded (conventional)
      // unit, so it shares their value space rather than conversion_factor's.
      table.integer('conversion_offset').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('conversion_offset')
    })
  }
}
