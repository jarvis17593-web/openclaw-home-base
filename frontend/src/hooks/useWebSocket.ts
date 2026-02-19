/**
 * Hook for WebSocket connection management
 */

import { useEffect, useState, useCallback } from 'react'
import { wsClient } from '../services/websocket'

export function useWebSocket(token?: string) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    const handleConnection = (isConnected: boolean) => {
      if (mounted) {
        setConnected(isConnected)
      }
    }

    wsClient.onConnection(handleConnection)

    // Attempt to connect, but don't throw if it fails
    // WebSocket will keep trying to reconnect in the background
    wsClient
      .connect(token)
      .catch((err) => {
        if (mounted) {
          console.warn('WebSocket connection failed:', err)
          setError(err instanceof Error ? err : new Error(String(err)))
          // Don't throw - dashboard is still functional without WebSocket
        }
      })

    return () => {
      mounted = false
      wsClient.offConnection(handleConnection)
      // Note: Don't disconnect on unmount - keep connection alive
    }
  }, [token])

  const subscribe = useCallback(
    (type: string, handler: (data: unknown) => void) => {
      wsClient.on(type, handler)
      return () => wsClient.off(type, handler)
    },
    [],
  )

  return { connected, error, subscribe }
}
