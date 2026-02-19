import React, { useState } from 'react'
import { Header } from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'

export function Settings() {
  const { token, logout } = useAuth()
  const [gatewayUrl, setGatewayUrl] = useState(
    localStorage.getItem('gatewayUrl') || 'http://localhost:18789',
  )

  const handleSaveSettings = () => {
    localStorage.setItem('gatewayUrl', gatewayUrl)
    alert('Settings saved!')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="Settings" />
      <div className="space-y-6 p-6">
        {/* Connection Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Connection</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Gateway URL
              </label>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
              <p className="mt-2 text-xs text-gray-500">
                URL of the OpenClaw Gateway instance
              </p>
            </div>
            <button
              onClick={handleSaveSettings}
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>

        {/* Authentication */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Authentication</h2>
          <div className="mt-4 space-y-4">
            {token && (
              <div className="rounded bg-green-50 p-3 text-sm text-green-700">
                ✅ Authenticated (token stored locally)
              </div>
            )}
            <button
              onClick={logout}
              className="rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* About */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">About</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>
              <strong>OpenClaw Home Base</strong>
            </p>
            <p>Version: 1.0.0 (Wave 4)</p>
            <p>
              Dashboard for managing OpenClaw agents, monitoring API costs, and tracking
              system health.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
