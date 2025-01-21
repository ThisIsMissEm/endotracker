import Parameter from '#models/parameter'
import Report from '#models/report'
import ReportFinding from '#models/report_finding'
import Setting from '#models/setting'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

type Recording = {
  value: number
  parameterId: number
  testedAt: string
  reportId: number
}

export default class DashboardController {
  async index({ view }: HttpContext) {
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
      .where('show_on_dashboard', true)
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

    const recordings = records.reduce<Map<number, Recording[]>>((memo, recording) => {
      recording.value = recording.value / 1000
      const recordingsForParameter = memo.get(recording.parameterId)
      if (!recordingsForParameter) {
        memo.set(recording.parameterId, [recording])
      } else {
        memo.set(recording.parameterId, recordingsForParameter.concat([recording]))
      }
      return memo
    }, new Map<number, Recording[]>())

    return view.render('dashboard/index', {
      startYear: startYear,
      parameters,
      recordings,
      reportCount: Number.parseInt(reports?.count ?? '0'),
    })
  }
}
