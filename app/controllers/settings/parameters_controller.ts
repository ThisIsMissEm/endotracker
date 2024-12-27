import Parameter from '#models/parameter'
import Unit from '#models/unit'
import { createParameterValidator } from '#validators/parameter'
import type { HttpContext } from '@adonisjs/core/http'

export default class ParametersController {
  /**
   * Display a list of resource
   */
  async index({ view }: HttpContext) {
    const units = await Unit.all()
    const parameters = await Parameter.query().preload('unit').orderBy('created_at', 'asc')
    const referenceTypes = Parameter.referenceTypes

    return view.render('settings/parameters/index', { parameters, units, referenceTypes })
  }

  async export({ response }: HttpContext) {
    const parameters = await Parameter.query().preload('unit').orderBy('created_at', 'asc')

    response.safeHeader('Content-Disposition', 'attachment; filename="endotracker-parameters.json"')
    response.json({
      items: parameters.map((p) =>
        p.serialize({
          fields: { omit: ['id'] },
          relations: {
            unit: { fields: { omit: ['id'] } },
          },
        })
      ),
    })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response }: HttpContext) {
    const newParameter = await request.validateUsing(createParameterValidator)

    await Parameter.create(newParameter)

    return response.redirect().toRoute('settings.parameters.index')
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
