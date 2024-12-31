import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import Unit from './unit.js'
import ReportFinding from './report_finding.js'

export default class Parameter extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column({ serializeAs: null })
  declare unitId: number

  @belongsTo(() => Unit)
  declare unit: BelongsTo<typeof Unit>

  @column()
  declare referenceType:
    | 'range'
    | 'greater_than'
    | 'greater_than_or_equal'
    | 'less_than'
    | 'less_than_or_equal'

  @column({
    prepare: (value: any) => {
      return (value * 1000).toFixed(0)
    },
    consume: (value) => {
      return value / 1000
    },
  })
  declare referenceMinimum: number | null

  @column({
    prepare: (value: any) => {
      return (value * 1000).toFixed(0)
    },
    consume: (value) => {
      return value / 1000
    },
  })
  declare referenceMaximum: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static referenceTypes = [
    'range',
    'greater_than',
    'greater_than_or_equal',
    'less_than',
    'less_than_or_equal',
  ] as const

  @hasMany(() => ReportFinding)
  declare reportFindings: HasMany<typeof ReportFinding>
}
