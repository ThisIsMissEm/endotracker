import edge from 'edge.js'
import i18nManager from '@adonisjs/i18n/services/main'
import formatters from '@poppinss/intl-formatter'
import { NumberFormatOptions } from '@adonisjs/i18n/types'
import Parameter from '#models/parameter'
import { DateTime } from 'luxon'
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

edge.global(
  'formatRange',
  (start: number | string, end: number | string, options: NumberFormatOptions = {}) => {
    const locale = i18nManager.locale(i18nManager.defaultLocale).locale
    const startValue = (start = typeof start === 'string' ? Number(start) : start)
    const endValue = (end = typeof end === 'string' ? Number(end) : end)

    return formatters.number(locale, options).formatRange(startValue, endValue)
  }
)

type ComparsionResult = 'within' | 'exceeds' | 'subceeds' | 'unknown'

edge.global(
  'compareFindingWithParameter',
  (finding: number | undefined, parameter: Parameter): ComparsionResult => {
    let result: ComparsionResult = 'unknown'

    if (finding === undefined) {
      return result
    }

    result = 'within'
    switch (parameter.referenceType) {
      case 'range':
        if (finding > parameter.referenceMaximum!) {
          result = 'exceeds'
        } else if (finding < parameter.referenceMinimum!) {
          result = 'subceeds'
        }
        break
      case 'less_than':
        if (finding >= parameter.referenceMaximum!) {
          result = 'exceeds'
        }
        break
      case 'less_than_or_equal':
        if (finding > parameter.referenceMaximum!) {
          result = 'exceeds'
        }
        break
      case 'greater_than':
        if (finding <= parameter.referenceMinimum!) {
          result = 'subceeds'
        }
        break
      case 'greater_than_or_equal':
        if (finding < parameter.referenceMinimum!) {
          result = 'subceeds'
        }
        break
    }
    return result
  }
)
