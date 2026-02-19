import React, { useState } from 'react'
import { Header } from '../components/layout/Header'
import { useAPI } from '../hooks/useAPI'
import { apiClient } from '../services/api'

interface ErrorRecord {
  id: string
  timestamp: number
  agentId: string
  errorType: string
  errorCode?: string
  errorMessage: string
  requestId?: string
  retryCount: number
  resolved: boolean
  resolutionNotes?: string
  createdAt: number
  resolvedAt?: number
}

interface ErrorStats {
  totalErrors: number
  resolved: number
  unresolved: number
  errorTypes: number
  avgRetries: number
  avgResolutionTimeMs: number
  resolutionRate: string
}

interface ErrorDistribution {
  [errorType: string]: number
}

export function ErrorTracking() {
  const [filter, setFilter] = useState('all')
  const [hoursBack, setHoursBack] = useState('24')
  const [selectedErrorType, setSelectedErrorType] = useState<string | null>(null)

  // Fetch errors
  const { data: errorsData, loading: errorsLoading } = useAPI(
    () =>
      apiClient.getAPI(
        `/errors?hoursBack=${hoursBack}${selectedErrorType ? `&errorType=${selectedErrorType}` : ''}&limit=100`,
        { method: 'GET' }
      ),
    true
  )

  // Fetch stats
  const { data: statsData, loading: statsLoading } = useAPI(
    () =>
      apiClient.getAPI(
        `/errors/stats?hoursBack=${hoursBack}`,
        { method: 'GET' }
      ),
    true
  )

  const errors = (errorsData as any)?.errors || []
  const stats = (statsData as any)?.stats as ErrorStats | undefined
  const distribution = (statsData as any)?.distribution as ErrorDistribution | undefined

  const filteredErrors =
    filter === 'all'
      ? errors
      : filter === 'resolved'
        ? errors.filter((e) => e.resolved)
        : errors.filter((e) => !e.resolved)

  const getErrorColor = (errorType: string) => {
    switch (errorType) {
      case 'rate_limit':
        return 'text-yellow-700 bg-yellow-50'
      case 'timeout':
        return 'text-orange-700 bg-orange-50'
      case 'auth_error':
        return 'text-red-700 bg-red-50'
      case 'server_error':
        return 'text-red-700 bg-red-50'
      case 'invalid_input':
        return 'text-blue-700 bg-blue-50'
      case 'connection_error':
        return 'text-red-700 bg-red-50'
      default:
        return 'text-gray-700 bg-gray-50'
    }
  }

  const handleResolveError = async (errorId: string) => {
    try {
      await apiClient.getAPI(`/errors/${errorId}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({
          resolutionNotes: 'Resolved via dashboard',
        }),
      })
      // Refresh the data
      window.location.reload()
    } catch (error) {
      console.error('Failed to resolve error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="Error Tracking" subtitle="API error analysis and resolution" />
      <div className="space-y-6 p-6">
        {/* Stats Cards */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
              <div className="text-sm font-medium text-gray-500">Total Errors</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalErrors}</div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
              <div className="text-sm font-medium text-gray-500">Unresolved</div>
              <div className="mt-2 text-3xl font-bold text-red-600">{stats.unresolved}</div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
              <div className="text-sm font-medium text-gray-500">Resolution Rate</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{stats.resolutionRate}%</div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
              <div className="text-sm font-medium text-gray-500">Avg Retries</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{stats.avgRetries}</div>
            </div>
          </div>
        )}

        {/* Error Type Distribution */}
        {!statsLoading && distribution && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900">Error Distribution</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(distribution).map(([errorType, count]) => (
                <div key={errorType}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{errorType}</span>
                    <span className="text-gray-600">{count} errors</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${((count as number) / (stats?.totalErrors || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Time Range</label>
              <select
                value={hoursBack}
                onChange={(e) => setHoursBack(e.target.value)}
                className="mt-2 rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="1">Last 1 hour</option>
                <option value="6">Last 6 hours</option>
                <option value="24">Last 24 hours</option>
                <option value="168">Last 7 days</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mt-2 rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All ({errors.length})</option>
                <option value="unresolved">Unresolved ({errors.filter((e) => !e.resolved).length})</option>
                <option value="resolved">Resolved ({errors.filter((e) => e.resolved).length})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Errors Table */}
        {errorsLoading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="text-center text-gray-500">Loading errors...</div>
          </div>
        ) : filteredErrors.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="text-center text-gray-500">No errors found</div>
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
                      Error Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Retries
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredErrors.map((error: ErrorRecord) => (
                    <tr key={error.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(error.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{error.agentId}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getErrorColor(error.errorType)}`}>
                          {error.errorType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{error.errorMessage.substring(0, 50)}...</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{error.retryCount}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            error.resolved
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {error.resolved ? 'Resolved' : 'Open'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {!error.resolved && (
                          <button
                            onClick={() => handleResolveError(error.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Resolve
                          </button>
                        )}
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
