import * as d3 from 'd3'

type Recording = {
  testedAt: Date
  value: number
}

function renderChart(rootNode: HTMLDivElement | null) {
  if (rootNode === null) return

  const startDate = new Date(Date.parse(rootNode.dataset.startDate ?? ''))
  const referenceMinimum = parseFloat(rootNode.dataset.referenceMinimum ?? '0')
  const referenceMaximum = parseFloat(rootNode.dataset.referenceMaximum ?? '0')
  let dataset: Recording[] = []

  const rows = rootNode.querySelectorAll<HTMLTableRowElement>('.data tbody tr')
  rows.forEach((row) => {
    if (!row.dataset.value || !row.dataset.testedAt) {
      return
    }

    const parsedDate = Date.parse(row.dataset.testedAt)
    if (isNaN(parsedDate)) {
      return
    }

    const value = parseFloat(row.dataset.value)
    const testedAt = new Date(parsedDate)

    dataset.push({
      testedAt,
      value,
    })
  })

  dataset = dataset.sort((a, b) => {
    if (a.testedAt > b.testedAt) return 1
    if (a.testedAt < b.testedAt) return -1
    return 0
  })

  let maxDate = startDate
  let maxValue = 0

  dataset.forEach((d) => {
    if (d.testedAt > maxDate) maxDate = d.testedAt
    if (d.value > maxValue) maxValue = d.value
  })

  console.log({ maxValue, referenceMaximum, referenceMinimum, dataset })

  // if (maxValue === 0) {
  //   maxValue = referenceMaximum
  // }

  maxValue *= 1.2

  // if (maxValue < referenceMaximum) {
  //   maxValue = Math.min(maxValue, referenceMaximum / 10) * 1.2
  // } else {
  //   maxValue = maxValue * 1.2
  // }

  const width = rootNode.clientWidth
  const height = Math.min(300, width / 2)
  const marginTop = 20
  const marginRight = 50
  const marginBottom = 35
  const marginLeft = 30

  const svg = d3
    .create('svg')
    .attr('viewBox', [0, 0, width, height])
    .attr('width', width)
    .attr('height', height)
    .attr('style', 'max-width: 100%; height: auto; height: intrinsic; font: 14px sans-serif;')
    .style('-webkit-tap-highlight-color', 'transparent')
    .style('overflow', 'visible')

  const x = d3.scaleUtc([startDate, maxDate], [marginLeft, width - marginRight])
  const y = d3.scaleLinear([0, maxValue], [height - marginBottom, marginTop])

  // Declare the line generator.
  const line = d3
    .line<Recording>()
    .x((d) => x(d.testedAt))
    .y((d) => y(d.value))

  svg
    .append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).ticks(dataset.length + 4))
    .call((g) => g.attr('font-size', '14px').select('.domain').attr('stroke', '#aaa'))

  svg
    .append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call((g) => g.attr('font-size', '14px').select('.domain').attr('stroke', '#aaa'))
    .call((g) =>
      g
        .selectAll('.tick line')
        .clone()
        .attr('x2', width - marginLeft - marginRight)
        .attr('stroke', '#aaa')
        .attr('stroke-opacity', 0.1)
    )

  if (dataset.length === 0) {
    svg
      .append('g')
      .attr('transform', `translate(0,-10)`)
      .call((g) => {
        g.append('text')
          .attr('font-size', '20px')
          .style('text-align', 'center')
          .attr('x', '50%')
          .attr('y', '50%')
          .attr('dominant-baseline', 'middle')
          .attr('text-anchor', 'middle')
          .text('No data available.')
      })

    rootNode.querySelector('.data-recordings')?.classList.add('d-none')
  }

  // Reference Maximum:
  const extents = y.domain()
  const maxY = Math.max.apply(Math, extents)
  if (referenceMaximum > 0 && referenceMaximum < maxY) {
    svg
      .append('g')
      .attr('font-size', '12px')
      .attr('transform', `translate(${marginLeft},${y(referenceMaximum)})`)
      .call((g) => {
        g.append('line')
          .attr('stroke', '#f00')
          .attr('x2', width - marginLeft - marginRight)
      })
      .call((g) => {
        g.append('text')
          .attr('x', width - marginLeft - marginRight + 5)
          .attr('y', 3)
          .text('Max')
      })
  } else if (referenceMaximum > 0 && maxY < referenceMaximum) {
    svg
      .append('g')
      .attr('font-size', '12px')
      .attr('transform', `translate(${marginLeft},${y(maxY)})`)
      .call((g) => {
        g.append('text')
          .attr('x', width - marginLeft - marginRight + 5)
          .attr('y', 3)
          .text('↑ Max')
      })
  }

  // Reference Minimum:
  if (referenceMinimum > 0 && maxY > referenceMaximum) {
    svg
      .append('g')
      .attr('font-size', '12px')
      .attr('transform', `translate(${marginLeft},${y(referenceMinimum)})`)
      .call((g) => {
        g.append('line')
          .attr('stroke', '#f0f')
          .attr('x2', width - marginLeft - marginRight)
      })
      .call((g) => {
        g.append('text')
          .attr('x', width - marginLeft - marginRight + 5)
          .attr('y', 3)
          .text('Min')
      })
  }

  svg
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 1.5)
    .attr('d', line(dataset))

  svg
    .append('g')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 1.5)
    .attr('fill', 'white')
    .selectAll('circle')
    .data(dataset)
    .join('circle')
    .attr('cx', (d) => x(d.testedAt))
    .attr('cy', (d) => y(d.value))
    .attr('r', 3)

  const chart = svg.node()
  if (chart) {
    rootNode.querySelectorAll('.graph')[0].appendChild(chart)
    // rootNode.querySelectorAll('.data')[0].classList.add('d-none')
  }
}

const charts = document.querySelectorAll<HTMLDivElement>('[data-chart-id]')

charts.forEach((chart) => renderChart(chart))
