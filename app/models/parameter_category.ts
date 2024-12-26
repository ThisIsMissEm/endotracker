import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ParameterCategory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string
}
