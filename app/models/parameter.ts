import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import Unit from './unit.js'
import ReportFinding from './report_finding.js'

// Language-neutral Unicode collation (ICU root, "und") so diacritics like ö
// sort next to their base letter, with numeric-aware ordering (e.g. T3 before
// T4). Built once at module scope. Kept app-side because a SQL COLLATE clause
// isn't portable across Postgres and a future SQLite (better-sqlite3 has no ICU).
const nameCollator = new Intl.Collator('und', { numeric: true })

export default class Parameter extends BaseModel {
  static referenceMinTypes = ['range', 'greater_than', 'greater_than_or_equal']
  static referenceMaxTypes = ['range', 'less_than', 'less_than_or_equal']

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
    | 'none'
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

  @column({
    prepare: (value: any) => {
      return (value * 1000).toFixed(0)
    },
    consume: (value) => {
      return value / 1000
    },
  })
  declare optimalValue: number | null

  @column({ serializeAs: null })
  declare siUnitId: number

  @belongsTo(() => Unit, {
    foreignKey: 'siUnitId',
  })
  declare siUnit: BelongsTo<typeof Unit>

  @column({
    prepare: (value: any) => {
      return (value * 100000000).toFixed(0)
    },
    consume: (value) => {
      return value / 100000000
    },
  })
  declare conversionFactor: number | null

  @column({
    // Guarded against null so clearing the field stores NULL rather than 0:
    // `(null * 1000).toFixed(0)` would be "0", and `null / 1000` would be 0.
    prepare: (value: number | null) => {
      return value === null || value === undefined ? value : (value * 1000).toFixed(0)
    },
    consume: (value: number | null) => {
      return value === null || value === undefined ? value : value / 1000
    },
  })
  declare conversionOffset: number | null

  /**
   * Whether this parameter can actually be shown in SI units: it needs both
   * a target unit and a usable factor. Without the factor check, `toSI` would
   * be a silent no-op while the UI swapped the label to the SI abbreviation,
   * captioning recorded values with the wrong unit.
   *
   * The validator already requires a factor whenever an SI unit is set, so
   * this is defence in depth rather than a reachable state today.
   */
  get canConvertToSI(): boolean {
    return !!this.siUnitId && (this.conversionFactor ?? 0) > 0
  }

  /**
   * Convert a value recorded in this parameter's unit into its SI unit.
   *
   * Values are always stored in the recorded (conventional) unit; SI is a
   * display-time conversion only, so there is no inverse of this method.
   *
   * The offset is expressed in conventional units, which makes the stored
   * values read the same as published conversions — e.g. HbA1c NGSP % to
   * IFCC mmol/mol is `(value - 2.15) * 10.929`.
   *
   * Only valid for absolute values (findings, reference bounds, optimal
   * values). A difference between two readings would convert without the
   * offset.
   */
  toSI(value: number | null): number | null {
    if (value === null || value === undefined) {
      return null
    }

    return (value - (this.conversionOffset ?? 0)) * (this.conversionFactor ?? 1)
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare showOnDashboard: boolean

  static referenceTypes = [
    'none',
    'range',
    'greater_than',
    'greater_than_or_equal',
    'less_than',
    'less_than_or_equal',
  ] as const

  /**
   * All parameters, ordered by name using a language-neutral Unicode collation
   * (so ö sorts next to o, T3 before T4). Ordering is done in the app rather
   * than SQL for portability across database engines.
   */
  static async sortedByName() {
    const parameters = await this.all()
    parameters.sort((a, b) => nameCollator.compare(a.name, b.name))
    return parameters
  }

  @hasMany(() => ReportFinding)
  declare reportFindings: HasMany<typeof ReportFinding>
}
