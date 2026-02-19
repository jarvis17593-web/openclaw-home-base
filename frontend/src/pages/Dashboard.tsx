import React, { useState } from 'react'
import { Header } from '../components/layout/Header'
import { AgentList } from '../components/AgentList'
import { CostTracker } from '../components/CostTracker'
import { HealthStatus } from '../components/HealthStatus'
import { AlertPanel } from '../components/AlertPanel'
import { useAgents } from '../hooks/useAgents'
import { useCosts } from '../hooks/useCosts'
import { useAPI } from '../hooks/useAPI'
import { useWebSocket } from '../hooks/useWebSocket'
import { apiClient } from '../services/api'

export function Dashboard() {
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
  const { connected } = useWebSocket()

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

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title="Dashboard"
        subtitle={`WebSocket: ${connected ? '🟢 Connected' : '🔴 Disconnected'}`}
      />
      <div className="space-y-6 p-6">
        {/* Cost Overview */}
        <CostTracker summary={summary} loading={costsLoading} />

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
