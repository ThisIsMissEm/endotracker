import vine from '@vinejs/vine'

export const updateSettingsValidator = vine.compile(
  vine.object({
    record_start_date: vine.date({ formats: ['YYYY-MM-DD'] }).nullable(),
  })
)
