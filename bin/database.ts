/*
|--------------------------------------------------------------------------
| Ace entry point
|--------------------------------------------------------------------------
|
| The "console.ts" file is the entrypoint for booting the AdonisJS
| command-line framework and executing commands.
|
| Commands do not boot the application, unless the currently running command
| has "options.startApp" flag set to true.
|
*/
import pg from 'pg'
import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import type { DatabaseConfig, PostgreConfig } from '@adonisjs/lucid/types/database'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

const ignition = new Ignitor(APP_ROOT, { importer: IMPORTER }).tap(async (app) => {
  app.booting(async () => {
    await import('#start/env')
  })
})

export class DatabaseHelperProcess {
  /**
   * Ignitor reference
   */
  #ignitor: Ignitor

  constructor(ignitor: Ignitor) {
    this.#ignitor = ignitor
  }

  async start(argv: string[]) {
    const app = this.#ignitor.createApp('unknown')

    await app.init()
    await app.boot()
    await app.start(async () => {})

    const db = (await app.importDefault<DatabaseConfig>(
      app.configPath('database.ts')
    )) as DatabaseConfig

    const dbConfig = db.connections[db.connection]

    if (!dbConfig || !dbConfig.connection) {
      console.error(`Cannot find database for config ${db.connection}`)
      return app.terminate()
    }

    if (!['pg', 'postgres', 'postgresql'].includes(dbConfig.client)) {
      console.error('Cannot interact with non-postgresql database')
      return app.terminate()
    }

    const connection = dbConfig.connection as PostgreConfig['connection']
    if (!connection) {
      console.error('Cannot interact postgresql with missing connection config')
      return app.terminate()
    }
    if (typeof connection === 'string' || typeof connection?.connectionString === 'string') {
      console.error('Cannot interact postgresql with connection string')
      return app.terminate()
    }

    const { database, connectionString, ...config } = connection
    if (!database) {
      console.error('Cannot interact postgresql: missing database name')
      return app.terminate()
    }

    const pgClient = new pg.Client(config)

    await pgClient.connect()

    let hasError = false
    try {
      switch (argv[0]) {
        case 'create':
          await pgClient.query(`CREATE DATABASE ${pg.escapeIdentifier(database)} ENCODING = "utf8"`)
          break
        case 'drop':
          await pgClient.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(database)}`)
          break
        case 'recreate':
          await pgClient.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(database)}`)
          await pgClient.query(`CREATE DATABASE ${pg.escapeIdentifier(database)} ENCODING = "utf8"`)
          break
        default:
          console.log('Unknown command, usage: node database create | drop')
      }
    } catch (err) {
      console.log(err.message)
      hasError = true
    } finally {
      if (!hasError) {
        console.log('Done!')
      }
    }

    await pgClient.end()
    await app.terminate()
  }
}

await new DatabaseHelperProcess(ignition).start(process.argv.splice(2)).catch((error) => {
  process.exitCode = 1
  prettyPrintError(error)
})
