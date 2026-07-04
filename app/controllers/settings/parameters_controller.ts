import Parameter from '#models/parameter'
import ReportTemplate from '#models/report_template'
import db from '@adonisjs/lucid/services/db'
import Unit from '#models/unit'
import { createParameterValidator, updateParameterValidator } from '#validators/parameter'
import type { HttpContext } from '@adonisjs/core/http'
import { ImportParametersService } from '#services/import_parameters_service'

export default class ParametersController {
  /**
   * Display a list of resource
   */
  async index({ view }: HttpContext) {
    const units = await Unit.query().orderBy('id', 'desc')
    const siUnits = await Unit.query().where('isInternationalSystem', true).orderBy('id', 'desc')
    const parameters = await Parameter.query().preload('unit').orderBy('id', 'asc')
    const referenceTypes = Parameter.referenceTypes

    return view.render('settings/parameters/index', { parameters, units, siUnits, referenceTypes })
  }

  async export({ response }: HttpContext) {
    const parameters = await Parameter.query()
      .preload('unit')
      .preload('siUnit')
      .orderBy('id', 'asc')

    response.safeHeader('Content-Disposition', 'attachment; filename="endotracker-parameters.json"')
    response.json({
      items: parameters.map((p) =>
        p.serialize({
          fields: { omit: ['id', 'createdAt', 'updatedAt'] },
          relations: {
            unit: { fields: { omit: ['id', 'createdAt', 'updatedAt'] } },
            siUnit: { fields: { omit: ['id', 'createdAt', 'updatedAt'] } },
          },
        })
      ),
    })
  }

  async import({ view }: HttpContext) {
    return view.render('settings/parameters/import')
  }

  async performImport({ request, response, session }: HttpContext) {
    const parametersFile = request.file('parameters', {
      size: '2mb',
      extnames: ['json'],
    })

    if (!parametersFile || !parametersFile.tmpPath) {
      session.flash('error', 'Missing parameters')
      return response.redirect().toRoute('settings.parameters.import')
    }

    const results = await ImportParametersService.import(parametersFile.tmpPath)

    session.flash(
      'success',
      results.importedCount > 0
        ? `Imported ${results.importedCount} parameters successfully`
        : 'All parameters already exist'
    )
    response.redirect().toRoute('settings.parameters.index')
  }

  /**
   * Display form to create a new record
   */
  async create({ view }: HttpContext) {
    const units = await Unit.query().orderBy('id', 'desc')
    const siUnits = await Unit.query().where('isInternationalSystem', true).orderBy('id', 'desc')
    const referenceTypes = Parameter.referenceTypes

    return view.render('settings/parameters/create', { units, siUnits, referenceTypes })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response }: HttpContext) {
    const newParameter = await request.validateUsing(createParameterValidator)

    if (newParameter.showOnDashboard === undefined) {
      newParameter.showOnDashboard = false
    }

    await Parameter.create(newParameter)

    return response.redirect().toRoute('settings.parameters.index')
  }

  /**
   * Edit individual record
   */
  async edit({ params, view }: HttpContext) {
    const units = await Unit.query().orderBy('id', 'desc')
    const siUnits = await Unit.query().where('isInternationalSystem', true).orderBy('id', 'desc')

    const parameter = await Parameter.query()
      .where({ id: params.id })
      .preload('unit')
      .orderBy('created_at', 'asc')
      .firstOrFail()

    const referenceTypes = Parameter.referenceTypes

    return view.render('settings/parameters/edit', { parameter, units, siUnits, referenceTypes })
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ request, response }: HttpContext) {
    const { params, ...parameterProperties } = await request.validateUsing(updateParameterValidator)

    const parameter = await Parameter.findOrFail(params.id)

    // Allow toggling the visibility to off:
    if (parameterProperties.showOnDashboard === undefined) {
      parameterProperties.showOnDashboard = false
    }

    await parameter.merge(parameterProperties).save()

    return response.redirect().toRoute('settings.parameters.index')
  }

  /**
   * Delete record
   */
  async destroy({ params, session, response }: HttpContext) {
    const parameter = await Parameter.findOrFail(params.id)

    const usage = await db.rawQuery(
      `SELECT id FROM ??, jsonb_array_elements(contents::jsonb->'sections') sections, jsonb_array_elements(sections->'parameters') parameters WHERE ?::jsonb <@ (parameters)`,
      [ReportTemplate.table, parameter.id]
    )

    if (usage.rowCount === 0) {
      await parameter.delete()
      session.flash('success', 'Deleted parameter!')
    } else {
      session.flash('error', `Unable to delete "${parameter.name}" as report template(s) use it`)
    }

    return response.redirect().toRoute('settings.parameters.index')
  }
}
