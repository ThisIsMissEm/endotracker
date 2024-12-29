import Parameter from '#models/parameter'
import ReportTemplate from '#models/report_template'
import {
  createReportTemplateValidator,
  updateReportTemplateValidator,
} from '#validators/report_template'
import type { HttpContext } from '@adonisjs/core/http'

interface TemplateSection {
  name: string
  parameters: number[]
}

const convert = (sections: TemplateSection[]) => {
  return JSON.stringify({
    version: '1',
    sections: sections,
  })
}

export default class ReportTemplatesController {
  /**
   * Display a list of resource
   */
  async index({ view }: HttpContext) {
    const templates = await ReportTemplate.query()
      .select(['id', 'name', 'createdAt', 'updatedAt'])
      .orderBy('createdAt', 'asc')

    return view.render('settings/report-templates/index', { templates })
  }

  /**
   * Display form to create a new record
   */
  async create({ view }: HttpContext) {
    const parameters = await Parameter.query().preload('unit').orderBy('created_at', 'asc')
    return view.render('settings/report-templates/create', { parameters })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response }: HttpContext) {
    const { name, sections } = await request.validateUsing(createReportTemplateValidator)

    await ReportTemplate.create({ name: name, contents: convert(sections) })

    return response.redirect().toRoute('settings.report_templates.index')
  }

  /**
   * Show individual record
   */
  async show({ response, params, session }: HttpContext) {
    session.reflash()
    return response.redirect().toRoute('settings.report_templates.edit', { id: params.id })
  }

  /**
   * Edit individual record
   */
  async edit({ params, view }: HttpContext) {
    const template = await ReportTemplate.findOrFail(params.id)
    const parameters = await Parameter.query().preload('unit').orderBy('created_at', 'asc')

    return view.render('settings/report-templates/edit', { tpl: template, parameters })
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ request, response, session }: HttpContext) {
    const { params, name, sections } = await request.validateUsing(updateReportTemplateValidator)
    const template = await ReportTemplate.findOrFail(params.id)

    await template.merge({ name: name, contents: convert(sections) }).save()

    session.flash('success', 'Updated template!')
    return response.redirect().toRoute('settings.report_templates.edit', { id: template.id })
  }

  /**
   * Delete record
   */
  async destroy({ params, response, session }: HttpContext) {
    // const hasReports = Report.find({ template: })
    const template = await ReportTemplate.findOrFail(params.id)
    await template.delete()

    session.flash('success', 'Deleted template!')
    return response.redirect().toRoute('settings.report_templates.index')
  }
}
