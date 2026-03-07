import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * API auth middleware: returns 401 JSON when unauthenticated (no redirect).
 */
export default class ApiAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { guards?: (keyof Authenticators)[] } = {}) {
    try {
      await ctx.auth.authenticateUsing(options.guards || ['web'])
      return next()
    } catch {
      return ctx.response.unauthorized({ message: 'Não autorizado' })
    }
  }
}
