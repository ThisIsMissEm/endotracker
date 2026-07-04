import type Parameter from '#models/parameter'
import { ComparisonResult, Recording } from './types.js'

export default function compareFindingWithParameter(
  finding: number | undefined | Recording,
  parameter: Parameter
): ComparisonResult {
  let result: ComparisonResult = 'unknown'

  if (finding === undefined || (typeof finding === 'object' && !Object.hasOwn(finding, 'value'))) {
    return result
  }

  const findingValue = typeof finding === 'number' ? finding : finding.value

  result = 'within'
  switch (parameter.referenceType) {
    case 'range':
      if (findingValue > parameter.referenceMaximum!) {
        result = 'exceeds'
      } else if (findingValue < parameter.referenceMinimum!) {
        result = 'subceeds'
      }
      break
    case 'less_than':
      if (findingValue >= parameter.referenceMaximum!) {
        result = 'exceeds'
      }
      break
    case 'less_than_or_equal':
      if (findingValue > parameter.referenceMaximum!) {
        result = 'exceeds'
      }
      break
    case 'greater_than':
      if (findingValue <= parameter.referenceMinimum!) {
        result = 'subceeds'
      }
      break
    case 'greater_than_or_equal':
      if (findingValue < parameter.referenceMinimum!) {
        result = 'subceeds'
      }
      break
  }
  return result
}
