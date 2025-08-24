import type { HttpContext } from '@adonisjs/core/http'
import ReportTemplate from '#models/report_template'
import Report from '#models/report'
import Parameter from '#models/parameter'
import { createReportValidator, updateReportValidator } from '#validators/report'
import ReportFinding from '#models/report_finding'
import { ModelAttributes } from '@adonisjs/lucid/types/model'

export default class ReportsController {
  /**
   * Display a list of resource
   */
  async index({ view }: HttpContext) {
    const reports = await Report.query().orderBy('tested_at', 'asc').orderBy('id', 'asc')
    const reportTemplates = await ReportTemplate.query().select('id', 'name')

    return view.render('reports/index', {
      reports: reports.map((report) => ({
        ...report.serialize(),
        template: reportTemplates
          .find((template) => template.id === report.templateId)
          ?.serialize(),
      })),
    })
  }

  /**
   * Display form to create a new record
   */
  async create({ request, session, response, view }: HttpContext) {
    const templateId = request.input('template')
    if (!templateId) {
      const templates = await ReportTemplate.all()
      return view.render('reports/create', { templates })
    }

    const template = await ReportTemplate.find(templateId)
    if (!template) {
      session.flash('error', `We couldn't find that template, please select one`)
      return response.redirect().toRoute('reports.create')
    }

    const parameters = await this.getParameters()
    const findingsByParameter = new Map()

    return view.render('reports/create', {
      tpl: template.contents,
      templateId: template.id,
      parameters,
      findingsByParameter,
    })
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(createReportValidator)
    const report = await Report.create({ templateId: data.template, testedAt: data.testedAt })
    const { changed } = this.buildParameters(report, data.parameters)
    await ReportFinding.createMany(changed)

    session.flash('success', 'Report created successfully')
    return response.redirect().toRoute('reports.show', { id: report.id })
  }

  /**
   * Show individual record
   */
  async show({ params, view }: HttpContext) {
    const report = await Report.findOrFail(params.id)
    await report.load('findings')

    const template = await ReportTemplate.findOrFail(report.templateId)

    const parameters = await this.getParameters()
    const findingsByParameter = this.findingsByParameter(report)

    return view.render('reports/show', {
      tpl: template.contents,
      report,
      parameters,
      findingsByParameter,
    })
  }

  /**
   * Edit individual record
   */
  async edit({ params, view }: HttpContext) {
    const report = await Report.findOrFail(params.id)
    await report.load('findings')

    const template = await ReportTemplate.findOrFail(report.templateId)
    const parameters = await this.getParameters()
    const findingsByParameter = this.findingsByParameter(report)

    return view.render('reports/edit', {
      tpl: template.contents,
      report,
      parameters,
      findingsByParameter,
    })
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ request, response, session }: HttpContext) {
    const { params, parameters, ...reportProperties } =
      await request.validateUsing(updateReportValidator)

    const report = await Report.findOrFail(params.id)
    await report.merge(reportProperties).save()

    const { changed, deleted } = this.buildParameters(report, parameters)
    await ReportFinding.updateOrCreateMany(['reportId', 'parameterId'], changed)

    await ReportFinding.query()
      .where('reportId', report.id)
      .andWhereIn('parameterId', deleted)
      .delete()

    session.flash('success', 'Report updated successfully')
    return response.redirect().toRoute('reports.show', { id: params.id })
  }

  /**
   * Delete record
   */
  async destroy({ params, session, response }: HttpContext) {
    const report = await Report.findOrFail(params.id)

    await report.delete()

    session.flash('success', `Deleted Report #${params.id}!`)
    return response.redirect().toRoute('reports.index')
  }

  private async getParameters() {
    const parameters = new Map<number, Parameter>()
    for (let parameter of await Parameter.query().preload('unit').orderBy('created_at', 'asc')) {
      parameters.set(parameter.id, parameter)
    }
    return parameters
  }

  private findingsByParameter(report: Report) {
    const result = new Map<number, number>()

    report.findings.forEach((finding) => {
      return result.set(finding.parameterId, finding.value)
    })

    return result
  }

  private buildParameters(
    report: Report,
    parameters: Record<string, { parameter: number; value: number | null }>
  ) {
    const changed: Partial<ModelAttributes<InstanceType<typeof ReportFinding>>>[] = []
    const deleted: number[] = []

    Object.entries(parameters).forEach(([_, data]) => {
      if (data.value === null) {
        deleted.push(data.parameter)
        return
      }

      changed.push({
        reportId: report.id,
        parameterId: data.parameter,
        value: data.value,
      })
    })

    return {
      changed,
      deleted,
    }
  }
}
