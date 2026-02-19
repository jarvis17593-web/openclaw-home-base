/**
 * Hook for API calls with loading and error states
 */

import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '../services/api'

interface UseAPIState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAPI<T>(
  fn: () => Promise<T>,
  immediate: boolean = true,
  retryCount: number = 3,
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
    let lastError: Error | null = null

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const result = await fn()
        setState({ data: result, loading: false, error: null })
        return
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < retryCount - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 500)
          )
        }
      }
    }

    // All retries failed
    setState({ data: null, loading: false, error: lastError })
  }, [fn, retryCount])

  const refetch = useCallback(async () => {
    await execute()
  }, [execute])

  // Auto-execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute])

  return { ...state, refetch }
}
