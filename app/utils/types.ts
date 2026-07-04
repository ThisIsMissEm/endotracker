export type ComparisonResult = 'within' | 'exceeds' | 'subceeds' | 'unknown'

export type Recording = {
  value: number
  comparison: ComparisonResult
  parameterId: number
  testedAt: string
  reportId: number
}
