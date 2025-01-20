import vine from '@vinejs/vine'
import Unit from '#models/unit'

const unitSchema = vine.object({
  name: vine.string().unique({
    table: Unit.table,
    column: 'name',
    caseInsensitive: true,
    filter(db, _value, field) {
      if (field.parent?.params?.id) {
        db.andWhereNot('id', field.parent.params.id)
      }
    },
  }),

  abbreviation: vine.string().unique({
    table: Unit.table,
    column: 'abbreviation',
    caseInsensitive: true,
    filter(db, _value, field) {
      if (field.parent?.params?.id) {
        db.andWhereNot('id', field.parent.params.id)
      }
    },
  }),
})

/**
 * Validator to validate the payload when creating
 * a new unit.
 */
export const createUnitValidator = vine.compile(unitSchema)

/**
 * Validator to validate the payload when updating
 * an existing unit.
 */
export const updateUnitValidator = vine.compile(
  vine.object({
    // Validate route params
    params: vine.object({
      id: vine.number().positive().withoutDecimals(),
    }),

    ...unitSchema.getProperties(),
  })
)

