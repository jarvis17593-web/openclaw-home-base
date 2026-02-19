import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'

export function Login() {
  const navigate = useNavigate()
  const [gatewayUrl, setGatewayUrl] = useState('http://127.0.0.1:18789')
  const [gatewayToken, setGatewayToken] = useState('local-dev-token')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate inputs
      if (!gatewayUrl.trim() || !gatewayToken.trim()) {
        setError('Please enter both gateway URL and token')
        setLoading(false)
        return
      }

      // Store credentials
      localStorage.setItem('gatewayUrl', gatewayUrl)
      localStorage.setItem('authToken', gatewayToken)
      apiClient.setToken(gatewayToken)

      // Redirect to dashboard
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('gatewayUrl')
    localStorage.removeItem('authToken')
    apiClient.clearToken()
    setGatewayUrl('http://127.0.0.1:18789')
    setGatewayToken('local-dev-token')
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">🤖 OpenClaw</h1>
          <p className="mt-2 text-sm text-gray-600">Home Base Dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Gateway URL */}
          <div>
            <label htmlFor="gateway-url" className="block text-sm font-medium text-gray-700">
              Gateway URL
            </label>
            <input
              id="gateway-url"
              type="url"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="http://127.0.0.1:18789"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Local: http://127.0.0.1:18789 | Remote: https://your-domain
            </p>
          </div>

          {/* Gateway Token */}
          <div>
            <label htmlFor="gateway-token" className="block text-sm font-medium text-gray-700">
              Gateway Auth Token
            </label>
            <input
              id="gateway-token"
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              placeholder="your-gateway-token"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Found in OpenClaw: <code className="text-gray-700">openclaw status</code>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Connecting...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-center text-xs text-gray-500">
            OpenClaw Home Base v1.0.0-wave4
          </p>
          <p className="mt-2 text-center text-xs text-gray-500">
            🔒 Credentials are stored locally. Never shared.
          </p>
        </div>

        {/* Dev Logout Button */}
        {localStorage.getItem('authToken') && (
          <button
            onClick={handleLogout}
            className="mt-4 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Clear Stored Credentials
          </button>
        )}
      </div>
    </div>
  )
}
