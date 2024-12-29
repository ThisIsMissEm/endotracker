import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'report_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.text('name').notNullable()
      table.json('contents').defaultTo('{}').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
