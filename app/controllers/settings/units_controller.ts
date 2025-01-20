import type { HttpContext } from '@adonisjs/core/http'
import Unit from '#models/unit'
import Parameter from '#models/parameter'
import { createUnitValidator, updateUnitValidator } from '#validators/unit'

export default class UnitsController {
  /**
   * Display a list of resource
   */
  async index({ view }: HttpContext) {
    const units = await Unit.query().orderBy('id', 'asc')

    return view.render('settings/units/index', { units })
  }

  async export({ response }: HttpContext) {
    const units = await Unit.query().orderBy('id', 'asc')

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
  async edit({ view, params }: HttpContext) {
    const unit = await Unit.findOrFail(params.id)
    return view.render('settings/units/edit', { unit })
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ request, response, session }: HttpContext) {
    const { params, ...unitProperties } = await request.validateUsing(updateUnitValidator)

    const unit = await Unit.findOrFail(params.id)

    await unit.merge(unitProperties).save()

    session.flash('success', 'Unit updated!')
    return response.redirect().toRoute('settings.units.index')
  }

  /**
   * Delete record
   */
  async destroy({ params, session, response }: HttpContext) {
    const unit = await Unit.findOrFail(params.id)
    const usedParameter = await Parameter.findBy({ unitId: unit.id })

    if (usedParameter === null) {
      await unit.delete()
      session.flash('success', 'Deleted unit!')
    } else {
      session.flash('error', `Unable to delete "${unit.name}" as it is used by a Parameter`)
    }

    response.redirect().toRoute('settings.units.index')
  }
}
