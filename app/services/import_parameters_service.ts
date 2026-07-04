import Unit from '#models/unit'
import Parameter from '#models/parameter'
import { importParametersValidator } from '#validators/parameter'
import { readFile } from 'node:fs/promises'
import { ModelAttributes } from '@adonisjs/lucid/types/model'

type UnitPayload = { name: string; abbreviation: string; isInternationalSystem?: boolean }

export class ImportParametersService {
  static async import(importFilePath: string) {
    const data = await readFile(importFilePath, { encoding: 'utf-8' })
    const parameters = await importParametersValidator.validate(data)

    // Collect all units (primary + SI) keyed by lowercased name. A unit
    // referenced as an siUnit anywhere must be flagged international so it
    // satisfies the siUnitId "exists where is_international_system = true"
    // constraint. Note: fetchOrCreateMany is create-if-missing, so this does
    // not retro-flag a unit that already exists without the flag.
    const unitsMap = new Map<string, UnitPayload>()

    for (const parameter of parameters.items) {
      const primaryKey = parameter.unit.name.toLowerCase()
      if (!unitsMap.has(primaryKey)) {
        unitsMap.set(primaryKey, {
          name: parameter.unit.name,
          abbreviation: parameter.unit.abbreviation,
          isInternationalSystem: parameter.unit.isInternationalSystem ?? false,
        })
      }

      if (parameter.siUnit) {
        const siKey = parameter.siUnit.name.toLowerCase()
        const existing = unitsMap.get(siKey)
        if (existing) {
          existing.isInternationalSystem = true
        } else {
          unitsMap.set(siKey, {
            name: parameter.siUnit.name,
            abbreviation: parameter.siUnit.abbreviation,
            isInternationalSystem: true,
          })
        }
      }
    }

    const units = await Unit.fetchOrCreateMany('name', Array.from(unitsMap.values()))

    const results = await Parameter.fetchOrCreateMany(
      'name',
      parameters.items.reduce<Partial<ModelAttributes<InstanceType<typeof Parameter>>>[]>(
        (acc, parameter) => {
          const unit = units.find((u) => u.name.toLowerCase() === parameter.unit.name.toLowerCase())

          if (!unit) {
            return acc
          }

          const siUnitRef = parameter.siUnit
          const siUnit = siUnitRef
            ? units.find((u) => u.name.toLowerCase() === siUnitRef.name.toLowerCase())
            : undefined

          acc.push({
            name: parameter.name,
            referenceType: parameter.referenceType,
            referenceMinimum: parameter.referenceMinimum,
            referenceMaximum: parameter.referenceMaximum,
            optimalValue: parameter.optimalValue,
            unitId: unit.id,
            ...(siUnit
              ? { siUnitId: siUnit.id, conversionFactor: parameter.conversionFactor }
              : {}),
          })

          return acc
        },
        []
      )
    )

    const importedCount = results.reduce((count, row) => {
      if (row.$isLocal) {
        count++
      }
      return count
    }, 0)

    return { importedCount, rows: results }
  }
}
