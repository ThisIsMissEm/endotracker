import edge from 'edge.js'

/**
 * Define a global property
 */
edge.global('today', () => {
  // This gives back YYYY-MM-DD which is what date inputs need
  const shortDate = new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'short',
  })

  return shortDate.format(Date.now())
})
