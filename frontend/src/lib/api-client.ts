import createClient from 'openapi-fetch'
import type { paths } from './api-schema'

/**
 * Fully typed API client generated from the backend's OpenAPI description
 * (backend: `npm run openapi`, then here: `npm run api:types`).
 * A renamed field or changed endpoint becomes a TypeScript error at build time.
 *
 *   const { data, error } = await apiClient.GET('/api/v1/attempts/{attemptId}', { params: { path: { attemptId } } })
 */
export const apiClient = createClient<paths>({ baseUrl: '/', credentials: 'include' })
