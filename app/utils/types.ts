export type ComparisonResult = 'within' | 'exceeds' | 'subceeds' | 'unknown'

export type TemplateSection = {
  name: string
  parameters: number[]
}

/**
 * The shape stored in `report_templates.contents`. Note the column is a
 * Postgres `json`, so the driver hands this back parsed even though the model
 * declares it as a string.
 */
export type TemplateContents = {
  version: string
  sections: TemplateSection[]
}

export type Recording = {
  value: number
  comparison: ComparisonResult
  parameterId: number
  testedAt: string
  reportId: number
}
