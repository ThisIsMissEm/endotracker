import { startDateValidator } from '#validators/setup'
import type { HttpContext } from '@adonisjs/core/http'
import { shortDate } from '../utils/dates.js'
import Setting from '#models/setting'
import { ImportUnitsService } from '#services/import_unit_service'

const steps = ['basics', 'import-units', 'finish']

export default class SetupController {
  async index({ request, response, view }: HttpContext) {
    const step = request.qs().step
    const state: Record<string, string> = { step: step }

    if (step && !steps.includes(step)) {
      return response.redirect().toRoute('setup.show')
    }

    const currentStep = steps.findIndex((s) => s === step)
    if (steps.length > currentStep) {
      state.nextStep = steps[currentStep + 1]
    }
    if (currentStep > 0) {
      state.previousStep = steps[currentStep - 1]
    }

    if (step === 'basics') {
      const startDate = await Setting.findBy({ key: 'record_start_date' })
      if (startDate?.value) {
        state.startDate = startDate.value
      }
    }

    return view.render('setup/index', state)
  }

  async storeStartDate({ request, response }: HttpContext) {
    const { startDate } = await request.validateUsing(startDateValidator)

    await Setting.updateOrCreate(
      { key: 'record_start_date' },
      {
        key: 'record_start_date',
        value: shortDate.format(startDate),
      }
    )

    response.redirect().toRoute('setup.show', {}, { qs: { step: 'import-units' } })
  }

  async importUnits({ request, response, session }: HttpContext) {
    const importFile = request.file('units', {
      size: '2mb',
      extnames: ['json'],
    })

    if (!importFile || !importFile.tmpPath) {
      session.flash('error', 'Missing file to import')
      return response.redirect().toRoute('setup.show', {}, { qs: { step: 'import-units' } })
    }

    const results = await ImportUnitsService.import(importFile.tmpPath)
    // For testing onboarding:
    // results.importedCount = results.rows.length

    if (results.importedCount === 0) {
      session.flash('importSuccess', `There weren't any units of measurement to import, that's ok`)
    } else {
      session.flash(
        'importSuccess',
        `Imported ${results.importedCount} ${results.importedCount > 1 ? 'units' : 'unit'} of measurement successfully`
      )
    }

    response.redirect().toRoute('setup.show', {}, { qs: { step: 'finish' } })
  }

  async completeSetup({ response }: HttpContext) {
    await Setting.updateOrCreate({ key: 'configured' }, { key: 'configured', value: 'true' })

    response.redirect().toRoute('home')
  }
}
