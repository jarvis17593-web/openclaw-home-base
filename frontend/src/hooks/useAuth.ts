/**
 * Hook for authentication state management
 */

import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '../services/api'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if already authenticated on mount
  useEffect(() => {
    const stored = localStorage.getItem('authToken')
    if (stored) {
      setToken(stored)
      setIsAuthenticated(true)
      apiClient.setToken(stored)
    }
    setLoading(false)
  }, [])

  const login = useCallback(
    async (gatewayUrl: string, gatewayToken: string) => {
      try {
        setLoading(true)
        // In a real app, you'd exchange credentials for an access token
        // For now, we'll use the gateway token directly
        localStorage.setItem('gatewayUrl', gatewayUrl)
        localStorage.setItem('authToken', gatewayToken)
        apiClient.setToken(gatewayToken)
        setToken(gatewayToken)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('gatewayUrl')
    apiClient.clearToken()
    setToken(null)
    setIsAuthenticated(false)
  }, [])

  return {
    isAuthenticated,
    token,
    loading,
    login,
    logout,
  }
}
