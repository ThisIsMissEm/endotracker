import Parameter from '#models/parameter'
import Report from '#models/report'
import ReportFinding from '#models/report_finding'
import Setting from '#models/setting'
import Unit from '#models/unit'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import { Recording } from '../utils/types.js'
import compareFindingWithParameter from '../utils/comparison.js'
import assert from 'node:assert'

export default class DashboardController {
  async index({ view, request }: HttpContext) {
    const hasSIUnits = await Unit.hasSIUnits()
    const useSIUnits = hasSIUnits && request.qs().si_units === 'true'
    const recordStartDate = await Setting.findBy({ key: 'record_start_date' })
    let startYear: DateTime = DateTime.now().startOf('year')

    if (recordStartDate?.value) {
      const parsed = DateTime.fromFormat(recordStartDate.value, 'yyyy-MM-dd')
      if (parsed.isValid) {
        startYear = parsed.startOf('month')
      }
    }

    const parameters = await Parameter.query()
      .preloadOnce('unit')
      .preloadOnce('siUnit')
      .where('show_on_dashboard', true)
      .orderBy('id', 'asc')
      .exec()

    const reports = await db.query<{ count: string }>().from(Report.table).count('id').first()

    const records = await db
      .query<Recording>()
      .from(ReportFinding.table)
      .join(Report.table, 'reports.id', '=', 'report_findings.report_id')
      .select([
        'report_findings.value as value',
        'report_findings.parameter_id as parameterId',
        'report_findings.report_id as reportId',
        'reports.tested_at as testedAt',
      ])
      .whereIn(
        'parameter_id',
        parameters.map((r) => r.id)
      )
      .whereRaw('reports.tested_at >= :start', {
        start: startYear.toSQL() ?? 0,
      })
      .orderBy('reports.tested_at')

    const recordings = records.reduce<Map<number, Recording[]>>((memo, record) => {
      const parameter = parameters.find((p) => p.id === record.parameterId)
      assert(parameter)

      const useSIUnit = useSIUnits && !!parameter.siUnitId && (parameter.conversionFactor ?? 0) > 0
      const factor = parameter.conversionFactor ?? 1
      const convert = (value: number) => (useSIUnit ? value * factor : value)

      const recording = {
        ...record,
        // we divide by 1000 here to match ReportFinding's conversions:
        value: convert(record.value / 1000),
        comparison: compareFindingWithParameter(record.value / 1000, parameter),
      }
      const recordingsForParameter = memo.get(recording.parameterId)
      if (!recordingsForParameter) {
        memo.set(recording.parameterId, [recording])
      } else {
        memo.set(recording.parameterId, recordingsForParameter.concat([recording]))
      }
      return memo
    }, new Map<number, Recording[]>())

    // Prepare each chart's data server-side, already resolved to the unit being
    // shown (SI or recorded), and hand it to the client as a JSON blob on the
    // `.graph` element's `data-graph` attribute. The chart is then a dumb
    // renderer: it plots exactly the units the table shows.
    // The locale the server-side number formatters use, passed to the chart so
    // its client-side tooltips/markers format numbers like the rendered UI.
    const locale = i18nManager.locale(i18nManager.defaultLocale).locale

    const graphs = new Map<number, string>()
    for (const parameter of parameters) {
      const useSIUnit = useSIUnits && !!parameter.siUnitId
      const factor = parameter.conversionFactor ?? 1
      const convert = (value: number | null) =>
        value === null ? null : useSIUnit ? value * factor : value

      graphs.set(
        parameter.id,
        JSON.stringify({
          locale,
          startDate: startYear.toISO(),
          unit: useSIUnit ? parameter.siUnit.abbreviation : parameter.unit.abbreviation,
          // Which reference bounds are meaningful depends on the reference type.
          referenceMinimum: Parameter.referenceMinTypes.includes(parameter.referenceType)
            ? convert(parameter.referenceMinimum)
            : null,
          referenceMaximum: Parameter.referenceMaxTypes.includes(parameter.referenceType)
            ? convert(parameter.referenceMaximum)
            : null,
          optimalValue: convert(parameter.optimalValue),
          recordings: (recordings.get(parameter.id) ?? []).map((recording) => ({
            testedAt: new Date(recording.testedAt).toISOString(),
            // recording.value is already SI-resolved in the reduce above.
            value: recording.value,
          })),
        })
      )
    }

    return view.render('dashboard/index', {
      startYear: startYear,
      parameters,
      recordings,
      graphs,
      reportCount: Number.parseInt(reports?.count ?? '0'),
      useSIUnits,
      hasSIUnits,
    })
  }
}
