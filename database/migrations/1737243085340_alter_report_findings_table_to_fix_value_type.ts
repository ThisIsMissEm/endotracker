import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'report_findings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('value').alter({ alterType: true })
    })
  }

  async down() {}
}
