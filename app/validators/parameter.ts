import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import Unit from '#models/unit'
import Parameter from '#models/parameter'

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

    showOnDashboard: vine.boolean().optional(),
  })
)

/**
 * Validator to validate the payload when updating
 * an existing unit.
 */
export const updateParameterValidator = vine.compile(
  vine.object({
    // Validate route params
    params: vine.object({
      id: vine.number().positive().withoutDecimals(),
    }),

    name: vine.string().unique(async (db, value, field) => {
      const row = await db
        .from(Parameter.table)
        .whereRaw(`lower(name) = ?`, [db.raw(`lower(?)`, [value])])
        .andWhereNot('id', field.parent.params.id)
        .first()

      return row === null
    }),

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

    showOnDashboard: vine.boolean().optional(),
  })
)

export const importParametersValidator = vine.compile(
  vine
    .object({
      items: vine.array(
        vine.object({
          name: vine.string(),
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
              return ['range', 'less_than', 'less_than_or_equal'].includes(
                field.parent.referenceType
              )
            }),

          showOnDashboard: vine.boolean().optional(),

          createdAt: vine.string(),
          updatedAt: vine.string(),
          unit: vine.object({
            name: vine.string(),
            abbreviation: vine.string(),
          }),
        })
      ),
    })
    .parse((input) => {
      if (typeof input === 'string') {
        return JSON.parse(input)
      }
    })
)
