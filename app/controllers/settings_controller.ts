import Setting from '#models/setting'
import { updateSettingsValidator } from '#validators/settings'
import type { HttpContext } from '@adonisjs/core/http'

const shortDate = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'short',
})

export default class SettingsController {
  async index({ view }: HttpContext) {
    const settings = await Setting.findManyBy({ key: 'record_start_date' })
    const serialised = settings.reduce<Record<string, string>>((memo, setting) => {
      memo[setting.key] = setting.value
      return memo
    }, {})

    return view.render('settings/index', {
      settings: serialised,
    })
  }

  async update({ request, response, logger }: HttpContext) {
    const settings = await request.validateUsing(updateSettingsValidator)
    logger.debug(settings)

    if (settings.record_start_date) {
      await Setting.updateOrCreate(
        { key: 'record_start_date' },
        { key: 'record_start_date', value: shortDate.format(settings.record_start_date) }
      )
    }

    response.redirect().toRoute('settings.index')
  }
}
