/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router
      .resource('units', () => import('#controllers/settings/units_controller'))
      .only(['index', 'store', 'edit', 'update', 'destroy'])

    router
      .get('units/export', [() => import('#controllers/settings/units_controller'), 'export'])
      .as('units.export')

    router
      .resource('parameters', () => import('#controllers/settings/parameters_controller'))
      .only(['index', 'store', 'edit', 'update', 'destroy'])

    router
      .get('parameters/export', [
        () => import('#controllers/settings/parameters_controller'),
        'export',
      ])
      .as('parameters.export')

    router
      .resource(
        'report-templates',
        () => import('#controllers/settings/report_templates_controller')
      )
      .only(['index', 'show', 'create', 'store', 'edit', 'update', 'destroy'])

    router.on('/').render('settings/index').as('index')
  })
  .prefix('settings')
  .as('settings')

router.on('/').render('home').as('home')
