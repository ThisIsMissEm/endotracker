import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'parameters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      table.text('name').notNullable()
      table.integer('category_id').references('id').inTable('parameter_categories')
      table.integer('unit_id').references('id').inTable('units').notNullable()

      table.text('reference_type').notNullable()
      table.integer('reference_minimum').nullable()
      table.integer('reference_maximum').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
