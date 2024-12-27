import vine from '@vinejs/vine'
import Unit from '#models/unit'
import Parameter from '#models/parameter'
// import ParameterCategory from '#models/parameter_category'

/**
 * Validator to validate the payload when creating
 * a new unit.
 */
export const createParameterValidator = vine.compile(
  vine.object({
    name: vine.string().unique({
      table: Parameter.table,
      column: 'name',
      caseInsensitive: true,
    }),

    // categoryId: vine
    //   .number()
    //   .exists({
    //     table: ParameterCategory.table,
    //     column: 'id',
    //   })
    //   .optional(),

    unitId: vine.number().exists(async (db, value) => {
      const row = await db.from(Unit.table).select('id').where({ id: value }).first()
      return row ? true : false
    }),

    referenceType: vine.enum(Parameter.referenceTypes),

    referenceMinimum: vine
      .number()
      .positive()
      .decimal([0, 3])
      .optional()
      .requiredWhen((field) => {
        return ['range', 'greater_than', 'greater_than_or_equal'].includes(
          field.parent.referenceType
        )
      }),

    referenceMaximum: vine
      .number()
      .positive()
      .decimal([0, 3])
      .optional()
      .requiredWhen((field) => {
        return ['range', 'less_than', 'less_than_or_equal'].includes(field.parent.referenceType)
      }),
  })
)

/**
 * Validator to validate the payload when updating
 * an existing unit.
 */
export const updateUnitValidator = vine.compile(vine.object({}))
