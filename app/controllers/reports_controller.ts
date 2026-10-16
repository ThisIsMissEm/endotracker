import type { HttpContext } from '@adonisjs/core/http'
import ReportTemplate from '#models/report_template'
import Report from '#models/report'
import Parameter from '#models/parameter'
import { createReportValidator, updateReportValidator } from '#validators/report'
import ReportFinding from '#models/report_finding'
import { ModelAttributes } from '@adonisjs/lucid/types/model'
import Unit from '#models/unit'
import type { TemplateContents, TemplateSection } from '#utils/types'

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
      const templates = await ReportTemplate.query().orderBy('id', 'asc')
      return view.render('reports/create', { templates })
    }

    const template = await ReportTemplate.find(templateId)
    if (!template) {
      session.flash('error', `We couldn't find that template, please select one`)
      return response.redirect().toRoute('reports.create')
    }

    const parameters = await this.getParameters()
    const findingsByParameter = new Map<number, number>()
    const contents = template.contents as unknown as TemplateContents

    return view.render('reports/create', {
      sections: this.sectionsWithUnlisted(contents, findingsByParameter, parameters),
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
  async show({ request, params, view }: HttpContext) {
    const hasSIUnits = await Unit.hasSIUnits()
    const useSIUnits = hasSIUnits && request.qs().si_units === 'true'
    const report = await Report.findOrFail(params.id)
    await report.load('findings')

    const template = await ReportTemplate.findOrFail(report.templateId)

    const parameters = await this.getParameters()
    const findingsByParameter = this.findingsByParameter(report)

    return view.render('reports/show', {
      sections: this.sectionsWithUnlisted(
        template.contents as unknown as TemplateContents,
        findingsByParameter,
        parameters
      ),
      report,
      parameters,
      findingsByParameter,
      useSIUnits,
      hasSIUnits,
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
      sections: this.sectionsWithUnlisted(
        template.contents as unknown as TemplateContents,
        findingsByParameter,
        parameters
      ),
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
    const rawParameters = await Parameter.query()
      .preload('unit')
      .preload('siUnit')
      .orderBy('id', 'desc')

    for (let parameter of rawParameters) {
      parameters.set(parameter.id, parameter)
    }
    return parameters
  }

  /**
   * The template's sections, plus a trailing "Other" section holding any
   * finding whose parameter the template no longer lists.
   *
   * A report is fixed to its template at creation, but the template itself
   * stays editable — removing a parameter from it would otherwise silently
   * hide findings that older reports already recorded against it. Returning
   * them as an ordinary section means the views need no second code path.
   */
  private sectionsWithUnlisted(
    contents: TemplateContents,
    findingsByParameter: Map<number, number>,
    parameters: Map<number, Parameter>
  ): TemplateSection[] {
    // `report_templates.contents` defaults to `{"version":"1"}`, so a row that
    // never went through the template form has no `sections` key at all.
    const sections = contents.sections ?? []
    const listed = new Set(sections.flatMap((section) => section.parameters))
    const unlisted = [...findingsByParameter.keys()]
      .filter((parameterId) => !listed.has(parameterId))
      .sort((a, b) => (parameters.get(a)?.name ?? '').localeCompare(parameters.get(b)?.name ?? ''))

    if (unlisted.length === 0) {
      return sections
    }

    return [...sections, { name: 'Other', parameters: unlisted }]
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
