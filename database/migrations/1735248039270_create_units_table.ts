import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'units'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      table.text('name').unique().notNullable()
      table.text('abbreviation').unique().notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
