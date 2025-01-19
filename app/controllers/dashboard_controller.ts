import Parameter from '#models/parameter'
import Report from '#models/report'
import ReportFinding from '#models/report_finding'
import Setting from '#models/setting'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { ModelAttributes } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'

export default class DashboardController {
  async index({ view, logger }: HttpContext) {
    const recordStartDate = await Setting.findBy({ key: 'record_start_date' })
    let startYear: DateTime = DateTime.now().startOf('year')

    if (recordStartDate?.value) {
      const parsed = DateTime.fromFormat(recordStartDate.value, 'yyyy-MM-dd')
      if (parsed.isValid) {
        startYear = parsed.startOf('month')
      }
    }

    type Recording = {
      value: number
      parameterId: number
      testedAt: string
      reportId: number
    }

    const records = await db
      .query<Recording>()
      .from(ReportFinding.table)
      .join(Report.table, 'reports.id', '=', 'report_findings.report_id')
      .join(Parameter.table, 'parameters.id', '=', 'report_findings.parameter_id')
      .select([
        'report_findings.value as value',
        'report_findings.parameter_id as parameterId',
        'reports.tested_at as testedAt',
        'reports.id as reportId',
      ])
      .where('parameters.show_on_dashboard', true)
      .whereRaw('reports.tested_at >= :start', {
        start: startYear.toSQL() ?? 0,
      })
      .orderBy('reports.tested_at')

    const parameters = await Parameter.query()
      .preloadOnce('unit')
      .whereIn(
        'id',
        records.map((r) => r.parameterId)
      )
      .exec()

    const recordings = records.reduce<Record<number, Recording[]>>((memo, recording) => {
      recording.value = recording.value / 1000
      if (!Array.isArray(memo[recording.parameterId])) {
        memo[recording.parameterId] = [recording]
      } else {
        memo[recording.parameterId].push(recording)
      }
      return memo
    }, {})

    return view.render('dashboard/index', {
      startYear: startYear,
      parameters,
      recordings,
    })
  }
}
