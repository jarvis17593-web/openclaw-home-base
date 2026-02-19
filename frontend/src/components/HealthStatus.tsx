import React from 'react'
import { HealthCheck } from '../types'

interface HealthStatusProps {
  checks: HealthCheck[]
  loading: boolean
}

export function HealthStatus({ checks, loading }: HealthStatusProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <div className="mt-4 text-center text-gray-500">Loading health checks...</div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅'
      case 'degraded':
        return '⚠️'
      case 'down':
        return '❌'
      default:
        return '❓'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-700'
      case 'degraded':
        return 'text-yellow-700'
      case 'down':
        return 'text-red-700'
      default:
        return 'text-gray-700'
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h3 className="text-lg font-semibold text-gray-900">System Health</h3>

      <div className="mt-4 space-y-3">
        {checks.map((check) => (
          <div key={check.id} className="flex items-center justify-between border-b pb-3">
            <div>
              <div className="font-medium text-gray-900">{check.component}</div>
              {check.latencyMs && (
                <div className="text-xs text-gray-500">{check.latencyMs}ms</div>
              )}
            </div>
            <span className={`text-lg ${getStatusColor(check.status)}`}>
              {getStatusIcon(check.status)} {check.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
