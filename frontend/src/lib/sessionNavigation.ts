import type { Router, RouteLocationNormalized } from 'vue-router'

/**
 * After a successful login: navigate to the `redirect` query parameter when
 * it is a plain string, otherwise fall back to the home route.
 */
export function redirectAfterLogin(
  router: Router,
  route: Pick<RouteLocationNormalized, 'query'>,
): void {
  router.push(
    typeof route.query.redirect === 'string' ? route.query.redirect : { name: 'home' },
  )
}

/**
 * After a successful registration: navigate to the home route.
 */
export function redirectAfterRegister(router: Router): void {
  router.push({ name: 'home' })
}

/**
 * After a successful email verification: navigate to the home route after a
 * short delay so the user can read the success message.
 */
export function redirectAfterVerify(router: Router): void {
  setTimeout(() => {
    router.push({ name: 'home' })
  }, 2000)
}

/**
 * When the user's session has expired (401 / auth error): navigate to the
 * login route without a redirect parameter so they receive a clean login page.
 */
export function redirectOnSessionExpiry(router: Router): void {
  router.push({ name: 'login' })
}

/**
 * When the API responds with "Already authenticated": redirect the user away
 * from guest-only pages to the home route.
 */
export function redirectAlreadyAuthenticated(router: Router): void {
  router.push({ name: 'home' })
}
