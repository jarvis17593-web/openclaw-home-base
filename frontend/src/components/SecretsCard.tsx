import React, { useEffect, useState } from 'react'
import { SecretRotationSummary, Secret } from '../types'

interface SecretsCardProps {
  summary: SecretRotationSummary | null
  loading: boolean
}

export function SecretsCard({ summary, loading }: SecretsCardProps) {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [expandedSecrets, setExpandedSecrets] = useState(false)

  useEffect(() => {
    if (!loading && summary) {
      fetchExpiringSecrets()
    }
  }, [loading, summary])

  const fetchExpiringSecrets = async () => {
    try {
      const response = await fetch('/api/secrets/expiring')
      if (response.ok) {
        const data = await response.json()
        setSecrets(data.secrets || [])
      }
    } catch (error) {
      console.error('Failed to fetch expiring secrets:', error)
    }
  }

  const markSecretAsRotated = async (id: string) => {
    try {
      const response = await fetch(`/api/secrets/${id}/rotated`, {
        method: 'PUT',
      })
      if (response.ok) {
        // Refresh the list
        await fetchExpiringSecrets()
      }
    } catch (error) {
      console.error('Failed to mark secret as rotated:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api_key':
        return '🔑'
      case 'token':
        return '🎫'
      case 'password':
        return '🔐'
      case 'certificate':
        return '📜'
      default:
        return '🔒'
    }
  }

  if (loading || !summary) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-center text-gray-500">Loading secrets...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">🔐 Secret Management</h3>
        <button
          onClick={() => setExpandedSecrets(!expandedSecrets)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {expandedSecrets ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total Secrets */}
        <div className="rounded bg-gray-50 p-3">
          <div className="text-xs font-medium text-gray-600">Total</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{summary.totalSecrets}</div>
        </div>

        {/* Due for Rotation */}
        <div className={`rounded p-3 ${summary.dueForRotation > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className="text-xs font-medium text-gray-600">Due for Rotation</div>
          <div
            className={`mt-1 text-2xl font-bold ${summary.dueForRotation > 0 ? 'text-red-600' : 'text-gray-900'}`}
          >
            {summary.dueForRotation}
          </div>
        </div>

        {/* Expiring in 7 Days */}
        <div
          className={`rounded p-3 ${summary.expiringInSevenDays > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}
        >
          <div className="text-xs font-medium text-gray-600">Expiring Soon (7d)</div>
          <div
            className={`mt-1 text-2xl font-bold ${summary.expiringInSevenDays > 0 ? 'text-yellow-600' : 'text-gray-900'}`}
          >
            {summary.expiringInSevenDays}
          </div>
        </div>

        {/* Active */}
        <div className="rounded bg-green-50 p-3">
          <div className="text-xs font-medium text-gray-600">Active</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{summary.active}</div>
        </div>
      </div>

      {/* Expiring Secrets List */}
      {expandedSecrets && secrets.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <h4 className="font-semibold text-gray-900">Secrets Due for Rotation</h4>
          <div className="mt-4 space-y-2">
            {secrets.map((secret) => (
              <div
                key={secret.id}
                className="flex items-center justify-between rounded bg-gray-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getTypeIcon(secret.secretType)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{secret.name}</p>
                    <p className="text-sm text-gray-500">
                      {secret.daysUntilRotation <= 0
                        ? '⚠️ Expired'
                        : `${secret.daysUntilRotation} days until rotation`}
                    </p>
                  </div>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(secret.status)}`}>
                    {secret.status.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => markSecretAsRotated(secret.id)}
                  className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  ✓ Mark Rotated
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {expandedSecrets && secrets.length === 0 && (
        <div className="mt-6 border-t pt-6 text-center">
          <p className="text-sm text-gray-500">No secrets due for rotation</p>
        </div>
      )}
    </div>
  )
}
