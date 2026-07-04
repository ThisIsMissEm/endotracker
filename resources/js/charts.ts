import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  type ChartDataset,
} from 'chart.js'
import 'chartjs-adapter-luxon'
import { DateTime } from 'luxon'

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend)

type GraphData = {
  locale: string
  startDate: string | null
  unit: string
  referenceMinimum: number | null
  referenceMaximum: number | null
  optimalValue: number | null
  recordings: { testedAt: string; value: number }[]
}

// A flat reference line spanning the chart's x-extent, drawn as its own dataset
// (keeps us off chartjs-plugin-annotation — one fewer dependency).
function referenceLine(
  label: string,
  value: number,
  color: string,
  xMin: number,
  xMax: number
): ChartDataset<'line'> {
  return {
    label,
    data: [
      { x: xMin, y: value },
      { x: xMax, y: value },
    ],
    backgroundColor: 'white',
    borderColor: color,
    borderWidth: 1,
    borderDash: [4, 6],
    pointRadius: 0,
    pointStyle: 'dash',
    fill: false,
    order: 1,
  }
}

// Rounds up to a "nice" axis maximum (20, 25, 40, 50, 0.02, …) aiming for ~5
// ticks, so the top gridline is a round number rather than a raw dataMax × 1.2.
function niceCeil(value: number): number {
  if (value <= 0) return 1
  const roughStep = value / 5
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const fraction = roughStep / magnitude
  const niceStep =
    (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) *
    magnitude
  const max = Math.ceil(value / niceStep) * niceStep
  // Guarantee a little headroom so the top point isn't clipped to the axis line.
  return max <= value ? max + niceStep : max
}

function renderChart(graphEl: HTMLElement) {
  const raw = graphEl.dataset.graph
  if (!raw) return

  let data: GraphData
  try {
    data = JSON.parse(raw)
  } catch {
    return
  }

  if (data.recordings.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'text-body-secondary text-center py-5 mb-0'
    empty.textContent = 'No data available.'
    graphEl.appendChild(empty)
    return
  }

  const points = data.recordings.map((recording) => ({
    x: new Date(recording.testedAt).valueOf(),
    y: recording.value,
  }))

  // Reference lines span from the record start date to the latest reading.
  const xMin = data.startDate ? new Date(data.startDate).valueOf() : points[0].x
  const xMax = points[points.length - 1].x

  const datasets: ChartDataset<'line'>[] = [
    {
      label: data.unit || 'Value',
      data: points,
      borderColor: 'steelblue',
      backgroundColor: 'white',
      borderWidth: 1.5,
      pointRadius: 3,
      tension: 0,
      order: 0,
    },
  ]

  // Scale the y-axis to the readings, not the reference bounds — otherwise a
  // far-off bound (e.g. a "<= 15.9" ceiling over readings near 0.5) flattens
  // the data into an unreadable line. A bound within 1.3× the data may stretch
  // the axis so it stays an in-scale line; anything further off becomes a
  // top-edge marker instead (see the edgeIndicators plugin below).
  const dataMax = Math.max(...points.map((point) => point.y))

  type Reference = { label: string; value: number; color: string }
  const references: Reference[] = []
  const addReference = (label: string, value: number | null, color: string) => {
    if (value !== null && value > 0) references.push({ label, value, color })
  }
  addReference('Max', data.referenceMaximum, '#e80000')
  addReference('Min', data.referenceMinimum, '#74baf7')
  addReference('Optimal', data.optimalValue, '#65c92b')

  // Bounds no more than 1.3× the data max may pull the axis up to stay in scale.
  const scaleCeiling = dataMax * 1.3
  const inScaleValues = references
    .map((reference) => reference.value)
    .filter((value) => value <= scaleCeiling)
  const yMax = niceCeil(Math.max(dataMax, ...inScaleValues))

  const offScale: Reference[] = []
  for (const reference of references) {
    if (reference.value <= yMax) {
      datasets.push(referenceLine(reference.label, reference.value, reference.color, xMin, xMax))
    } else {
      offScale.push(reference)
    }
  }

  // Matches the server-side formatters.number(...) used in the UI, so the
  // tooltips, markers, and rendered tables all read the same.
  const format = new Intl.NumberFormat(data.locale, {
    maximumSignificantDigits: 4,
    maximumFractionDigits: 4,
  })

  // Draws "↑ Max 443"-style markers at the top-right for any reference sitting
  // above the (data-scaled) y-axis, so an out-of-range bound is still signalled.
  const edgeIndicators = {
    id: 'edgeIndicators',
    // afterDatasetsDraw (not afterDraw) so the markers render before the
    // tooltip's afterDraw pass — otherwise they paint over the tooltip.
    afterDatasetsDraw(chart: Chart) {
      if (offScale.length === 0) return
      const { ctx, chartArea } = chart
      ctx.save()
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      offScale.forEach((reference, index) => {
        ctx.fillStyle = reference.color
        ctx.fillText(
          `↑ ${reference.label} ${format.format(reference.value)}`,
          chartArea.right,
          chartArea.top + 4 + index * 16
        )
      })
      ctx.restore()
    },
  }

  const canvas = document.createElement('canvas')
  graphEl.appendChild(canvas)

  new Chart(canvas, {
    type: 'line',
    data: { datasets },
    plugins: [edgeIndicators],
    options: {
      // No draw animation — charts render instantly.
      animation: false,
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      scales: {
        x: {
          type: 'time',
          min: xMin,
          // Generate the ticks ourselves — every 4 months from the start month —
          // so the shown ticks ARE these, and autoSkip can't hide intermediate
          // months that the year-dedup callback below relies on.
          time: { unit: 'month', minUnit: 'month', tooltipFormat: 'yyyy-MM-dd' },
          afterBuildTicks(scale) {
            const start = DateTime.fromMillis(scale.min).startOf('month')
            const end = DateTime.fromMillis(scale.max)

            // Adaptive cadence: keep the label count bounded as history grows,
            // stepping up through intervals that stay aligned to year boundaries
            // (each divides or is a multiple of 12), so the year-dedup still lands
            // on each year's first tick. ~12 labels max at any range.
            const spanMonths = end.diff(start, 'months').months
            const step = [4, 6, 12, 24, 36].find((months) => spanMonths / months <= 12) ?? 60

            const ticks: { value: number }[] = []
            let cursor = start
            while (cursor <= end) {
              ticks.push({ value: cursor.toMillis() })
              cursor = cursor.plus({ months: step })
            }
            scale.ticks = ticks
          },
          ticks: {
            maxRotation: 0,
            autoSkip: false,
            // Show the year only when it changes from the previous tick
            // ("Feb 2023", then "Jun"/"Oct", then "Feb 2024"…); bare months else.
            callback(value, index, ticks) {
              const date = DateTime.fromMillis(Number(value)).setLocale(data.locale)
              const previousYear =
                index > 0 ? DateTime.fromMillis(Number(ticks[index - 1].value)).year : null
              const month = date.toLocaleString({ month: 'short' })
              return previousYear === date.year ? month : `${month} ${date.year}`
            },
          },
        },
        y: {
          min: 0,
          max: yMax,
          title: { display: Boolean(data.unit), text: data.unit },
        },
      },
      plugins: {
        // Disable the default click-to-hide-dataset behaviour on legend items.
        legend: {
          onClick: () => {},
          labels: { boxWidth: 12, usePointStyle: true },
        },
        // Only surface tooltips for the actual recorded series, not the flat
        // reference lines (which would otherwise fire on every hover).
        tooltip: {
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            label: (item) => {
              if (!item.parsed.y) {
                return data.unit ? `0 ${data.unit}` : '0'
              }

              return data.unit
                ? `${format.format(item.parsed.y)} ${data.unit}`
                : format.format(item.parsed.y)
            },
          },
        },
      },
    },
  })
}

document.querySelectorAll<HTMLElement>('.graph[data-graph]').forEach(renderChart)
