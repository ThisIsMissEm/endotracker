import emitter from '@adonisjs/core/services/emitter'
import string from '@adonisjs/core/helpers/string'
import logger from '@adonisjs/core/services/logger'
import PinoHttp from 'pino-http'

const NS_PER_SEC = 1e9
const MS_PER_SEC = 1e6

emitter.on('http:request_completed', ({ ctx, duration }) => {
  const { request, response } = ctx

  // Don't log assets:
  if (
    request.url().startsWith('/resources') ||
    request.url().startsWith('/node_modules') ||
    request.url().startsWith('/@vite')
  ) {
    return
  }

  const req = PinoHttp.stdSerializers.req(request.request)
  const res = PinoHttp.stdSerializers.res(response.response)

  ctx.logger.info(
    {
      req: { ...req, method: ctx.request.method() },
      res,
      responseTime: (duration[0] * NS_PER_SEC + duration[1]) / MS_PER_SEC,
    },
    `request: ${ctx.request.method()} ${ctx.request.url()} - ${ctx.response.getStatus()} - ${string.prettyHrTime(duration)}`
  )
})

emitter.on('i18n:missing:translation', function (event) {
  logger.error(`i18n error: missing ${event.locale} translation for ${event.identifier}`)
})
