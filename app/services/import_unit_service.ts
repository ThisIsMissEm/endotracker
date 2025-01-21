import Unit from '#models/unit'
import { importUnitsValidator } from '#validators/unit'
import { readFile } from 'node:fs/promises'

export class ImportUnitsService {
  static async import(importFilePath: string) {
    const data = await readFile(importFilePath, { encoding: 'utf-8' })
    const parsed = await importUnitsValidator.validate(data)
    const results = await Unit.fetchOrCreateMany('name', parsed.items)

    const importedCount = results.reduce((count, row) => {
      if (row.$isLocal) {
        count++
      }
      return count
    }, 0)

    return { importedCount, rows: results }
  }
}
