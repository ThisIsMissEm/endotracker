import logger from '@adonisjs/core/services/logger'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import db from '@adonisjs/lucid/services/db'

export default class Unit extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare abbreviation: string

  @column()
  declare isInternationalSystem: boolean

  static async hasSIUnits() {
    const firstSIUnit = await Unit.query().where('is_international_system', true).first()
    return firstSIUnit !== null
  }
}
