import React, { useState } from 'react'
import { Alert } from '../types'
import { apiClient } from '../services/api'

interface AlertPanelProps {
  alerts: Alert[]
  onAlertAcknowledge?: (alertId: string) => void
}

export function AlertPanel({ alerts, onAlertAcknowledge }: AlertPanelProps) {
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set())

  const handleAcknowledge = async (alertId: string) => {
    try {
      setAcknowledging((prev) => new Set(prev).add(alertId))
      await apiClient.acknowledgeAlert(alertId)
      onAlertAcknowledge?.(alertId)
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    } finally {
      setAcknowledging((prev) => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '❓'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'error':
        return 'border-red-400 bg-red-50'
      case 'warning':
        return 'border-yellow-400 bg-yellow-50'
      case 'info':
        return 'border-blue-400 bg-blue-50'
      default:
        return 'border-gray-400 bg-gray-50'
    }
  }

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged)

  if (unacknowledgedAlerts.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow">
        <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
        <div className="mt-4 text-center text-green-700">✅ All systems healthy</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Alerts ({unacknowledgedAlerts.length})
        </h3>
      </div>
      <div className="space-y-3 p-6">
        {unacknowledgedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border-l-4 p-4 ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getSeverityIcon(alert.severity)}</span>
                <div>
                  <div className="font-semibold text-gray-900">{alert.type}</div>
                  <div className="mt-1 text-sm text-gray-700">{alert.message}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleAcknowledge(alert.id)}
                disabled={acknowledging.has(alert.id)}
                className="ml-4 rounded bg-gray-600 px-3 py-1 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {acknowledging.has(alert.id) ? '...' : 'Ack'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
