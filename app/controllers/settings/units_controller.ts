import type { HttpContext } from '@adonisjs/core/http'
import Unit from '#models/unit'
import { createUnitValidator } from '#validators/unit'

export default class UnitsController {
  /**
   * Display a list of resource
   */
  async index({ view }: HttpContext) {
    const units = await Unit.all()

    return view.render('settings/units/index', { units })
  }

  async export({ response }: HttpContext) {
    const units = await Unit.all()

    response.safeHeader('Content-Disposition', 'attachment; filename="endotracker-units.json"')
    response.json({
      items: units.map((unit) => {
        return unit.serialize({ fields: ['name', 'abbreviation'] })
      }),
    })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response }: HttpContext) {
    const newUnit = await request.validateUsing(createUnitValidator)

    await Unit.create(newUnit)

    return response.redirect().toRoute('settings.units.index')
  }

  /**
   * Edit individual record
   */
  async edit({}: HttpContext) {}

  /**
   * Handle form submission for the edit action
   */
  async update({}: HttpContext) {}

  /**
   * Delete record
   */
  async destroy({}: HttpContext) {}
}
