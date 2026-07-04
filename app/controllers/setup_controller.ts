import { startDateValidator } from '#validators/setup'
import type { HttpContext } from '@adonisjs/core/http'
import { shortDate } from '../utils/dates.js'
import Setting from '#models/setting'
import { ImportUnitsService } from '#services/import_unit_service'
import { ImportParametersService } from '#services/import_parameters_service'
import { errors as vineErrors } from '@vinejs/vine'

const steps = ['basics', 'import-units', 'import-parameters', 'finish']

/**
 * Turns an import failure into a human-friendly message we can flash back to
 * the setup form. Covers the two ways an import throws: schema validation
 * (Vine) and malformed JSON (the validator's `.parse()` calling JSON.parse).
 */
function importErrorMessage(error: unknown): string {
  if (error instanceof vineErrors.E_VALIDATION_ERROR) {
    const messages = error.messages
    if (Array.isArray(messages) && messages.length > 0) {
      // Surface only the first issue plus a count. The flash is stored in the
      // session cookie (SESSION_DRIVER=cookie); joining every message can push
      // the cookie past the browser's ~4KB limit, which silently drops it and
      // loses the flash entirely.
      const first = messages[0]?.message ?? 'it did not match the expected format'
      const remaining = messages.length - 1
      const more = remaining > 0 ? ` (and ${remaining} more issue${remaining > 1 ? 's' : ''})` : ''
      return `The file couldn't be imported: ${first}${more}`
    }

    return `The file couldn't be imported because it didn't match the expected format.`
  }

  if (error instanceof SyntaxError) {
    return `The file couldn't be read as valid JSON. Please check the file and try again.`
  }

  return `Something went wrong importing the file. Please check the file and try again.`
}

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

    if (!importFile.isValid) {
      session.flash('error', importFile.errors.map((fileError) => fileError.message).join(', '))
      return response.redirect().toRoute('setup.show', {}, { qs: { step: 'import-units' } })
    }

    try {
      const results = await ImportUnitsService.import(importFile.tmpPath)

      if (results.importedCount === 0) {
        session.flash(
          'importSuccess',
          `There weren't any units of measurement to import, that's ok`
        )
      } else {
        session.flash(
          'importSuccess',
          `Imported ${results.importedCount} ${results.importedCount > 1 ? 'units' : 'unit'} of measurement successfully`
        )
      }
    } catch (error) {
      session.flash('error', importErrorMessage(error))
      return response.redirect().toRoute('setup.show', {}, { qs: { step: 'import-units' } })
    }

    response.redirect().toRoute('setup.show', {}, { qs: { step: 'import-parameters' } })
  }

  async importParameters({ request, response, session }: HttpContext) {
    const importFile = request.file('parameters', {
      size: '2mb',
      extnames: ['json'],
    })

    if (!importFile || !importFile.tmpPath) {
      session.flash('error', 'Missing file to import')
      return response.redirect().toRoute('setup.show', {}, { qs: { step: 'import-parameters' } })
    }

    if (!importFile.isValid) {
      session.flash('error', importFile.errors.map((fileError) => fileError.message).join(', '))
      return response.redirect().toRoute('setup.show', {}, { qs: { step: 'import-parameters' } })
    }

    try {
      const results = await ImportParametersService.import(importFile.tmpPath)

      if (results.importedCount === 0) {
        session.flash('importSuccess', `All parameters already exist`)
      } else {
        session.flash(
          'importSuccess',
          `Imported ${results.importedCount} ${results.importedCount > 1 ? 'parameters' : 'parameter'} successfully`
        )
      }
    } catch (error) {
      session.flash('error', importErrorMessage(error))
      return response.redirect().toRoute('setup.show', {}, { qs: { step: 'import-parameters' } })
    }

    response.redirect().toRoute('setup.show', {}, { qs: { step: 'finish' } })
  }

  async completeSetup({ response }: HttpContext) {
    await Setting.updateOrCreate({ key: 'configured' }, { key: 'configured', value: 'true' })

    response.redirect().toRoute('home')
  }
}
