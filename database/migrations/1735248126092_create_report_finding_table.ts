import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'report_findings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('report_id')
        .notNullable()
        .references('id')
        .inTable('reports')
        .onDelete('CASCADE')

      table.integer('parameter_id').notNullable().references('id').inTable('parameters')

      table.integer('value').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
