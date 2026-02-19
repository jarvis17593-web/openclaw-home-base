/**
 * Hook for fetching and managing costs
 */

import { useEffect, useState, useCallback } from 'react'
import { Cost, CostSummary } from '../types'
import { apiClient } from '../services/api'
import { wsClient } from '../services/websocket'

export function useCosts(period: '24h' | '7d' | '30d' = '30d') {
  const [costs, setCosts] = useState<Cost[]>([])
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true)
      const [costsData, summaryData] = await Promise.all([
        apiClient.getCosts(),
        apiClient.getCostSummary(period),
      ])
      setCosts(costsData)
      setSummary({
        total24h: summaryData.total,
        total7d: 0,
        total30d: 0,
        avgDaily: summaryData.avgDaily,
        trend: summaryData.trend as 'up' | 'down' | 'stable',
      })
      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    // Initial fetch
    fetchCosts()

    // Subscribe to cost updates via WebSocket
    const unsubscribe = wsClient.on('cost', (data: unknown) => {
      const newCost = data as Cost
      setCosts((prev) => [newCost, ...prev])
    })

    return unsubscribe as () => void
  }, [fetchCosts])

  return { costs, summary, loading, error, refetch: fetchCosts }
}
