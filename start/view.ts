import edge from 'edge.js'
import i18nManager from '@adonisjs/i18n/services/main'
import formatters from '@poppinss/intl-formatter'
import { NumberFormatOptions } from '@adonisjs/i18n/types'
import { DateTime } from 'luxon'
import compareFindingWithParameter from '../app/utils/comparison.js'
/**
 * Define a global property
 */
// This gives back YYYY-MM-DD which is what date inputs need
const shortDate = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'short',
})

edge.global('today', () => {
  return shortDate.format(Date.now())
})

edge.global('formatDate', (value: DateTime | Date | string) => {
  if (value instanceof DateTime) {
    return value.toFormat('yyyy-MM-dd')
  }

  if (typeof value === 'string') {
    return DateTime.fromISO(value).toFormat('yyyy-MM-dd')
  }

  if (typeof value === 'object' && value.constructor.name === 'Date') {
    return DateTime.fromJSDate(value).toFormat('yyyy-MM-dd')
  }
})

edge.global('formatNumber', (value: number, options: NumberFormatOptions) => {
  return i18nManager.locale(i18nManager.defaultLocale).formatNumber(value, options)
  // return formatters.number(locale, options).format(value)
})

edge.global(
  'formatRange',
  (start: number | string, end: number | string, options: NumberFormatOptions = {}) => {
    const locale = i18nManager.locale(i18nManager.defaultLocale).locale
    const startValue = (start = typeof start === 'string' ? Number(start) : start)
    const endValue = (end = typeof end === 'string' ? Number(end) : end)

    return formatters.number(locale, options).formatRange(startValue, endValue)
  }
)

edge.global('compareFindingWithParameter', compareFindingWithParameter)

edge.global('isInputInvalid', (name: string, flashMessages: any) => {
  return flashMessages.get('inputErrorsBag', {})[name] ? 'is-invalid' : ''
})
