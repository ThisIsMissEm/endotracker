import type { HttpContext } from '@adonisjs/core/http'
import { recordingsExportValidator } from '#validators/recordings_export'
import { RecordingsExportService } from '#services/recordings_export_service'

export default class RecordingsController {
  async export({ request, response }: HttpContext) {
    const payload = await recordingsExportValidator.validate(request.all())

    const result = await RecordingsExportService.export({
      parameters: payload.parameters,
      si: payload.si ?? false,
      format: payload.format,
    })

    response.safeHeader('Content-Type', result.contentType)
    response.safeHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    return response.send(result.body)
  }
}
