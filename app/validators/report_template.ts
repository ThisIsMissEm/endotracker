import Parameter from '#models/parameter'
import ReportTemplate from '#models/report_template'
import vine from '@vinejs/vine'

/**
 * Validator to validate the payload when creating
 * a new report template.
 */
export const createReportTemplateValidator = vine.compile(
  vine.object({
    returnTo: vine.string().optional(),

    name: vine.string().unique({
      table: ReportTemplate.table,
      column: 'name',
      caseInsensitive: true,
    }),

    sections: vine.array(
      vine.object({
        name: vine.string(),
        parameters: vine.array(
          vine.number().exists(async (_db, value) => {
            const param = await Parameter.find(value)
            return param !== null
          })
        ),
      })
    ),
  })
)

/**
 * Validator to validate the payload when updating
 * an existing report template.
 */
export const updateReportTemplateValidator = vine.compile(
  vine.object({
    // Validate route params
    params: vine.object({
      id: vine.number().positive().withoutDecimals(),
    }),

    name: vine
      .string()
      .trim()
      .minLength(1)
      .unique(async (db, value, field) => {
        const row = await db
          .from(ReportTemplate.table)
          .where('name', value)
          .andWhereNot('id', field.parent.params.id)
          .first()

        return row === null
      }),

    sections: vine
      .array(
        vine.object({
          name: vine.string().trim().minLength(1),
          parameters: vine
            .array(
              vine.number().exists(async (_db, value) => {
                const param = await Parameter.find(value)
                return param !== null
              })
            )
            .minLength(1),
        })
      )
      .minLength(1),
  })
)
