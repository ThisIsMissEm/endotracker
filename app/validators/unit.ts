import vine from '@vinejs/vine'
import Unit from '#models/unit'
/**
 * Validator to validate the payload when creating
 * a new unit.
 */
export const createUnitValidator = vine.compile(
  vine.object({
    name: vine.string().unique({
      table: Unit.table,
      column: 'name',
      caseInsensitive: true,
    }),

    abbreviation: vine.string().unique({
      table: Unit.table,
      column: 'abbreviation',
      caseInsensitive: true,
    }),
  })
)

/**
 * Validator to validate the payload when updating
 * an existing unit.
 */
export const updateUnitValidator = vine.compile(vine.object({}))
