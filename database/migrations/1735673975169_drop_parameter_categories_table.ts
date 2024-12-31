import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'parameter_categories'

  async up() {
    this.schema.dropTable(this.tableName)
  }
}
