import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

/**
 * Validator to validate the payload when creating
 * a new report template.
 */
export const createReportValidator = vine.compile(
  vine.object({
    template: vine.number().positive().withoutDecimals(),
    testedAt: vine
      .string()
      .regex(/^\d{4}\-\d{2}-\d{2}$/)
      .transform((value) => {
        return DateTime.fromFormat(value, 'yyyy-MM-dd')
      }),

    parameters: vine.record(
      vine.object({
        parameter: vine.number().positive().withoutDecimals(),
        value: vine.number().positive().decimal([0, 3]).nullable(),
      })
    ),
  })
)

export const updateReportValidator = vine.compile(
  vine.object({
    // Validate route params
    params: vine.object({
      id: vine.number().positive().withoutDecimals(),
    }),

    testedAt: vine
      .string()
      .regex(/^\d{4}\-\d{2}-\d{2}$/)
      .transform((value) => {
        return DateTime.fromFormat(value, 'yyyy-MM-dd')
      }),

    parameters: vine.record(
      vine.object({
        parameter: vine.number().positive().withoutDecimals(),
        value: vine.number().positive().decimal([0, 3]).nullable(),
      })
    ),
  })
)
