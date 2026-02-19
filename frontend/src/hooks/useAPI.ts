/**
 * Hook for API calls with loading and error states
 */

import { useState, useCallback } from 'react'
import { apiClient } from '../services/api'

interface UseAPIState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAPI<T>(
  fn: () => Promise<T>,
  immediate: boolean = true,
): UseAPIState<T> & {
  refetch: () => Promise<void>
} {
  const [state, setState] = useState<UseAPIState<T>>({
    data: null,
    loading: immediate,
    error: null,
  })

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null })
    try {
      const result = await fn()
      setState({ data: result, loading: false, error: null })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState({ data: null, loading: false, error })
    }
  }, [fn])

  const refetch = useCallback(async () => {
    await execute()
  }, [execute])

  // Auto-execute on mount if immediate is true
  if (immediate && state.data === null && !state.loading && state.error === null) {
    execute()
  }

  return { ...state, refetch }
}
