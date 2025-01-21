import vine from '@vinejs/vine'

export const startDateValidator = vine.compile(
  vine.object({
    startDate: vine.date({ formats: ['YYYY-MM-DD'] }),
  })
)
