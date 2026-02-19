import React, { useState } from 'react'
import { Header } from '../components/layout/Header'
import { AgentList } from '../components/AgentList'
import { CostTracker } from '../components/CostTracker'
import { HealthStatus } from '../components/HealthStatus'
import { AlertPanel } from '../components/AlertPanel'
import { ForecastCard } from '../components/ForecastCard'
import { ForecastChart } from '../components/ForecastChart'
import { useAgents } from '../hooks/useAgents'
import { useCosts } from '../hooks/useCosts'
import { useAPI } from '../hooks/useAPI'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '../hooks/useAuth'
import { apiClient } from '../services/api'

export function Dashboard() {
  const { token } = useAuth()
  const { agents, loading: agentsLoading, error: agentsError } = useAgents()
  const { summary, loading: costsLoading } = useCosts('30d')
  const [alerts, setAlerts] = useState<any[]>([])
  const [healthChecks, setHealthChecks] = useState<any[]>([])

  const { data: alertsData, loading: alertsLoading } = useAPI(
    () => apiClient.getAlerts(),
    true,
  )

  const { data: healthData, loading: healthLoading } = useAPI(
    () => apiClient.getHealth(),
    true,
  )

  // Set up WebSocket for real-time updates
  const { connected, error: wsError } = useWebSocket(token || undefined)

  React.useEffect(() => {
    if (alertsData) {
      setAlerts(alertsData)
    }
  }, [alertsData])

  React.useEffect(() => {
    if (healthData) {
      setHealthChecks(healthData)
    }
  }, [healthData])

  const handleAlertAcknowledge = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
    )
  }

  const isLoading = agentsLoading || costsLoading || alertsLoading || healthLoading

  if (isLoading && agents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header title="Dashboard" subtitle="Loading..." />
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mb-4 text-4xl">🤖</div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title="Dashboard"
        subtitle={`WebSocket: ${connected ? '🟢 Connected' : '🔴 Disconnected'}${wsError ? ' (error)' : ''}`}
      />
      <div className="space-y-6 p-6">
        {/* WebSocket Error Warning */}
        {wsError && (
          <div className="rounded-md bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ WebSocket connection failed: {wsError.message}
            </p>
            <p className="mt-1 text-xs text-yellow-700">
              Real-time updates won't work, but dashboard is still functional
            </p>
          </div>
        )}

        {/* Cost Overview */}
        <CostTracker summary={summary} loading={costsLoading} />

        {/* Forecast Card */}
        <ForecastCard loading={costsLoading} />

        {/* Forecast Chart */}
        <ForecastChart />

        {/* Alerts */}
        {alerts.length > 0 && (
          <AlertPanel alerts={alerts} onAlertAcknowledge={handleAlertAcknowledge} />
        )}

        {/* System Health */}
        <HealthStatus checks={healthChecks} loading={healthLoading} />

        {/* Agents */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Agents</h2>
          <AgentList agents={agents} loading={agentsLoading} error={agentsError} />
        </div>
      </div>
    </div>
  )
}
