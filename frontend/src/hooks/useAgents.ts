/**
 * Hook for fetching and managing agents
 */

import { useEffect, useState, useCallback } from 'react'
import { Agent } from '../types'
import { apiClient } from '../services/api'
import { wsClient } from '../services/websocket'

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.getAgents()
      setAgents(data)
      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchAgents()

    // Subscribe to agent updates via WebSocket
    const unsubscribe = wsClient.on('agent', (data: unknown) => {
      const agent = data as Agent
      setAgents((prev) => {
        const index = prev.findIndex((a) => a.id === agent.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = agent
          return updated
        }
        return [...prev, agent]
      })
    })

    return unsubscribe as () => void
  }, [fetchAgents])

  return { agents, loading, error, refetch: fetchAgents }
}
