import { useEffect, useState } from 'react'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

/** Thin fetch wrapper: same-origin, cookies included, JSON in/out. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error ?? res.statusText)
  }
  return res.json()
}

/** Minimal loader hook until TanStack Query is introduced with authenticated data (Phase 1). */
export function useApi<T>(path: string) {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: true })
  useEffect(() => {
    let live = true
    api<T>(path)
      .then((data) => live && setState({ data, loading: false }))
      .catch((error) => live && setState({ error, loading: false }))
    return () => { live = false }
  }, [path])
  return state
}

export const formatMoney = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100)
