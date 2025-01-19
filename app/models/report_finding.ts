import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Parameter from './parameter.js'
import Report from './report.js'

export default class ReportFinding extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reportId: number

  @column()
  declare parameterId: number

  @column({
    prepare: (value: any) => {
      return (value * 1000).toFixed(0)
    },
    consume: (value) => {
      return value / 1000
    },
  })
  declare value: number

  @belongsTo(() => Report)
  declare report: BelongsTo<typeof Report>

  @belongsTo(() => Parameter)
  declare parameter: BelongsTo<typeof Parameter>
}
