import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import ReportFinding from './report_finding.js'
import ReportTemplate from './report_template.js'

export default class Report extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare templateId: number

  @hasOne(() => ReportTemplate)
  declare template: HasOne<typeof ReportTemplate>

  @column.dateTime()
  declare testedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => ReportFinding)
  declare findings: HasMany<typeof ReportFinding>
}
