import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Me } from '@elite/shared'
import { api, ApiError } from './api'
import { authClient } from './auth-client'
import { clearOfflineData } from './offline-db'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try { return await api<Me>('/me') } catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e }
    },
    staleTime: 60_000,
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return async () => {
    await authClient.signOut()
    await clearOfflineData()
    qc.clear()
  }
}
