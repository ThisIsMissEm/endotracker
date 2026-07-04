import { DateTime } from 'luxon'
import { writeToString } from '@fast-csv/format'
import i18nManager from '@adonisjs/i18n/services/main'
import formatters from '@poppinss/intl-formatter'
import Parameter from '#models/parameter'
import Report from '#models/report'

// ---------------------------------------------------------------------------
// Local formatting helpers — mirrors the Edge globals in start/view.ts
// ---------------------------------------------------------------------------

function formatDate(value: DateTime): string {
  return value.toFormat('yyyy-MM-dd')
}

function formatNumber(value: number): string {
  const locale = i18nManager.locale(i18nManager.defaultLocale).locale
  return formatters
    .number(locale, { maximumSignificantDigits: 4, maximumFractionDigits: 4 })
    .format(value)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportOptions {
  parameters: number[]
  si: boolean
  format: 'csv' | 'markdown'
}

interface ExportResult {
  filename: string
  contentType: string
  body: string
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class RecordingsExportService {
  static async export(options: ExportOptions): Promise<ExportResult> {
    const { parameters: parameterIds, format } = options

    // 1. Load parameters with their units, in stable id order (defines column order).
    const parameters = await Parameter.query()
      .whereIn('id', parameterIds)
      .preload('unit')
      .preload('siUnit')
      .orderBy('id', 'asc')

    // 2. Determine per-parameter SI usage and column label.
    type ParameterMeta = {
      parameter: (typeof parameters)[number]
      useSI: boolean
      label: string
    }

    const paramMeta: ParameterMeta[] = parameters.map((parameter) => {
      const useSI = options.si && !!parameter.siUnitId
      const unitAbbrev = useSI ? parameter.siUnit.abbreviation : parameter.unit.abbreviation
      return {
        parameter,
        useSI,
        label: `${parameter.name} (${unitAbbrev})`,
      }
    })

    // 3. Load reports that have at least one finding for the selected parameters.
    const reports = await Report.query()
      .whereHas('findings', (q) => q.whereIn('parameterId', parameterIds))
      .preload('findings', (q) => q.whereIn('parameterId', parameterIds))
      .orderBy('testedAt', 'asc')

    // 4. Build header row.
    const header = ['Date', ...paramMeta.map((m) => m.label)]

    // 5. Build one data row per report.
    const dataRows: string[][] = reports.map((report) => {
      const dateCell = formatDate(report.testedAt)

      const valueCells = paramMeta.map(({ parameter, useSI }) => {
        const finding = report.findings.find((f) => f.parameterId === parameter.id)
        if (!finding) {
          return ''
        }
        const raw = finding.value
        const value = useSI ? raw * parameter.conversionFactor! : raw
        return formatNumber(value)
      })

      return [dateCell, ...valueCells]
    })

    // 6. Serialize.
    if (format === 'csv') {
      const body = await writeToString([header, ...dataRows])
      return {
        filename: 'endotracker-recordings.csv',
        contentType: 'text/csv; charset=utf-8',
        body,
      }
    }

    // markdown — GitHub-flavored pipe table
    const EN_DASH = '–'

    function escapeCell(cell: string): string {
      return cell.replace(/\|/g, '\\|')
    }

    function renderRow(cells: string[], emptyAs: string = ''): string {
      return `| ${cells.map((c) => escapeCell(c === '' ? emptyAs : c)).join(' | ')} |`
    }

    const separatorRow = `| ${header.map(() => '---').join(' | ')} |`

    const lines = [
      renderRow(header),
      separatorRow,
      ...dataRows.map((row) => renderRow(row, EN_DASH)),
    ]

    return {
      filename: 'endotracker-recordings.md',
      contentType: 'text/markdown; charset=utf-8',
      body: lines.join('\n') + '\n',
    }
  }
}
