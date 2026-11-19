import { createAuthClient } from 'better-auth/react'
import { twoFactorClient, usernameClient } from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'

/** Same-origin auth client: the session lives in an HttpOnly cookie, never in JavaScript. */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
  plugins: [usernameClient(), twoFactorClient(), passkeyClient()],
})
