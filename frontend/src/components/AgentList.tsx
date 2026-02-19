import React from 'react'
import { Agent } from '../types'

interface AgentListProps {
  agents: Agent[]
  loading: boolean
  error: Error | null
}

export function AgentList({ agents, loading, error }: AgentListProps) {
  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading agents...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error.message}</div>
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">No agents running</p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800'
      case 'idle':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '🟢'
      case 'idle':
        return '🟡'
      case 'error':
        return '🔴'
      default:
        return '⚪'
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Agent
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                PID
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {agents.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{agent.name}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(agent.status)}`}
                  >
                    {getStatusIcon(agent.status)} {agent.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{agent.pid || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {agent.lastActivityAt
                    ? new Date(agent.lastActivityAt).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
