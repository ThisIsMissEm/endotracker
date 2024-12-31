import Parameter from '#models/parameter'
import Unit from '#models/unit'
import { createParameterValidator, importParametersValidator } from '#validators/parameter'
import type { HttpContext } from '@adonisjs/core/http'
import { ModelAttributes } from '@adonisjs/lucid/types/model'
import { readFile } from 'node:fs/promises'

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

  async import({ view }: HttpContext) {
    return view.render('settings/parameters/import')
  }

  async doImport({ request, response, session }: HttpContext) {
    const parametersFile = request.file('parameters', {
      size: '2mb',
      extnames: ['json'],
    })

    if (!parametersFile || !parametersFile.tmpPath) {
      session.flash('error', 'Missing parameters')
      return response.redirect().toRoute('settings.parameters.import')
    }

    const data = await readFile(parametersFile.tmpPath, { encoding: 'utf-8' })
    const parameters = await importParametersValidator.validate(data)

    const unitsMap = parameters.items.reduce((result, parameter) => {
      if (result.has(parameter.unit.name.toLowerCase())) {
        return result
      }

      result.set(parameter.unit.name.toLowerCase(), parameter.unit)

      return result
    }, new Map<string, { name: string; abbreviation: string }>())

    const units = await Unit.fetchOrCreateMany('name', Array.from(unitsMap.values()))

    await Parameter.fetchOrCreateMany(
      'name',
      parameters.items.reduce<Partial<ModelAttributes<InstanceType<typeof Parameter>>>[]>(
        (acc, parameter) => {
          const unit = units.find((u) => u.name.toLowerCase() === parameter.unit.name.toLowerCase())

          if (!unit) {
            return acc
          }

          acc.push({
            name: parameter.name,
            referenceType: parameter.referenceType,
            referenceMinimum: parameter.referenceMinimum,
            referenceMaximum: parameter.referenceMaximum,
            unitId: unit.id,
          })

          return acc
        },
        []
      )
    )

    response.redirect().toRoute('settings.parameters.index')
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
