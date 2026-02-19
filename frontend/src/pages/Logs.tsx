import React, { useState, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { useAPI } from '../hooks/useAPI'
import { apiClient } from '../services/api'

export function Logs() {
  const [filter, setFilter] = useState('all')
  const { data: requests, loading } = useAPI(() => apiClient.getRequests(undefined, 100))

  const filteredRequests =
    requests?.filter((req) => {
      if (filter === 'all') return true
      if (filter === 'success') return req.status === 'success'
      if (filter === 'error') return req.status === 'error'
      if (filter === 'timeout') return req.status === 'timeout'
      return true
    }) || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50'
      case 'error':
        return 'text-red-700 bg-red-50'
      case 'timeout':
        return 'text-yellow-700 bg-yellow-50'
      default:
        return 'text-gray-700 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="Request Logs" subtitle="API request history and performance" />
      <div className="space-y-6 p-6">
        {/* Filter */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex gap-2">
            {['all', 'success', 'error', 'timeout'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-4 py-2 font-medium transition ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} (
                {f === 'all'
                  ? requests?.length || 0
                  : requests?.filter((r) => r.status === f).length || 0}
                )
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="text-center text-gray-500">Loading logs...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="text-center text-gray-500">No requests found</div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Latency
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(req.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.agentId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.model}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {req.promptTokens} → {req.completionTokens}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {req.latencyMs}ms
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ${req.costUsd.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(req.status)}`}
                        >
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
