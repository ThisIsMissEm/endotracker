import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ReportFinding from './report_finding.js'

export default class Report extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime()
  declare testedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => ReportFinding)
  declare findings: HasMany<typeof ReportFinding>
}
