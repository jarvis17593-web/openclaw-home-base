import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50">
      {/* Logo */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">🤖 OpenClaw</h2>
        <p className="text-xs text-gray-500">Home Base</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <Link
          to="/"
          className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
            isActive('/')
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          📊 Dashboard
        </Link>
        <Link
          to="/settings"
          className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
            isActive('/settings')
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          ⚙️ Settings
        </Link>
        <Link
          to="/logs"
          className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
            isActive('/logs')
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          📝 Logs
        </Link>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-3 py-4 space-y-2">
        <p className="text-xs text-gray-500">v1.0.0-wave4</p>
        <button
          onClick={handleLogout}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}
