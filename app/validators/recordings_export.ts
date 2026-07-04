import vine from '@vinejs/vine'
import Parameter from '#models/parameter'

export const recordingsExportValidator = vine.compile(
  vine.object({
    parameters: vine
      .array(
        vine.number().exists(async (db, value) => {
          const row = await db.from(Parameter.table).select('id').where({ id: value }).first()
          return row ? true : false
        })
      )
      .minLength(1),

    format: vine.enum(['csv', 'markdown'] as const),

    // Checkbox: present as "on" / absent when unchecked. vine.boolean() handles "on" → true.
    si: vine.boolean().optional(),
  })
)
