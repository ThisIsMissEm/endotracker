import Setting from '#models/setting'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class SetupMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const isSetupRoute = ctx.request.url().startsWith('/setup')

    const isConfigured = await Setting.findBy({ key: 'configured' })
    if (!isSetupRoute && isConfigured?.value !== 'true') {
      return ctx.response.redirect().toRoute('setup.show')
    }

    if (isSetupRoute && isConfigured?.value === 'true') {
      ctx.session.flash('notification', {
        type: 'warning',
        message: 'Endotracker has already been setup successfully!',
      })
      return ctx.response.redirect().toRoute('home')
    }

    return next()
  }
}
