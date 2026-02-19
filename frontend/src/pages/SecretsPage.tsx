import React, { useEffect, useState } from 'react'
import { Secret, SecretRotationSummary } from '../types'

export function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [summary, setSummary] = useState<SecretRotationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'rotation_due' | 'created'>('rotation_due')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring_soon' | 'expired'>('all')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    secretValue: '',
    secretType: 'api_key' as const,
    rotationFrequencyDays: 90,
    tags: '',
  })

  useEffect(() => {
    fetchSecrets()
    fetchSummary()

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchSecrets()
      fetchSummary()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const fetchSecrets = async () => {
    try {
      const response = await fetch('/api/secrets')
      if (response.ok) {
        const data = await response.json()
        setSecrets(data.secrets || [])
      }
    } catch (error) {
      console.error('Failed to fetch secrets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/secrets/summary')
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Failed to fetch secret summary:', error)
    }
  }

  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          rotationFrequencyDays: parseInt(formData.rotationFrequencyDays.toString()),
        }),
      })

      if (response.ok) {
        // Clear form and refresh
        setFormData({
          name: '',
          description: '',
          secretValue: '',
          secretType: 'api_key',
          rotationFrequencyDays: 90,
          tags: '',
        })
        setShowAddForm(false)
        await fetchSecrets()
        await fetchSummary()
      } else {
        const error = await response.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Failed to add secret:', error)
      alert('Failed to add secret')
    }
  }

  const handleMarkRotated = async (id: string) => {
    try {
      const response = await fetch(`/api/secrets/${id}/rotated`, {
        method: 'PUT',
      })

      if (response.ok) {
        await fetchSecrets()
        await fetchSummary()
      }
    } catch (error) {
      console.error('Failed to mark secret as rotated:', error)
    }
  }

  const handleDeleteSecret = async (id: string) => {
    if (!confirm('Are you sure you want to delete this secret?')) {
      return
    }

    try {
      const response = await fetch(`/api/secrets/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchSecrets()
        await fetchSummary()
        setSelectedSecret(null)
      }
    } catch (error) {
      console.error('Failed to delete secret:', error)
    }
  }

  const getSortedSecrets = () => {
    let filtered = secrets.filter((s) => {
      if (filterStatus === 'all') return true
      return s.status === filterStatus
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'rotation_due':
          return a.nextRotationDueAt - b.nextRotationDueAt
        case 'created':
          return b.createdAt - a.createdAt
        default:
          return 0
      }
    })
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

  const sortedSecrets = getSortedSecrets()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">🔐 Secret Management</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Add Secret
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Secrets</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{summary.totalSecrets}</div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Due for Rotation</div>
            <div
              className={`mt-2 text-3xl font-bold ${summary.dueForRotation > 0 ? 'text-red-600' : 'text-gray-900'}`}
            >
              {summary.dueForRotation}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Expiring Soon (7d)</div>
            <div
              className={`mt-2 text-3xl font-bold ${summary.expiringInSevenDays > 0 ? 'text-yellow-600' : 'text-gray-900'}`}
            >
              {summary.expiringInSevenDays}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Active</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{summary.active}</div>
          </div>
        </div>
      )}

      {/* Add Secret Form */}
      {showAddForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h3 className="text-lg font-bold text-gray-900">Add New Secret</h3>
          <form onSubmit={handleAddSecret} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Secret Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  placeholder="e.g., openai-api-key"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Secret Type *</label>
                <select
                  value={formData.secretType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      secretType: e.target.value as any,
                    })
                  }
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="api_key">API Key</option>
                  <option value="token">Token</option>
                  <option value="password">Password</option>
                  <option value="certificate">Certificate</option>
                </select>
              </div>

              {/* Rotation Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rotation Frequency (days) *
                </label>
                <select
                  value={formData.rotationFrequencyDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rotationFrequencyDays: parseInt(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  placeholder="e.g., production, critical"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                placeholder="Optional description"
                rows={2}
              />
            </div>

            {/* Secret Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Secret Value *</label>
              <textarea
                type="password"
                required
                value={formData.secretValue}
                onChange={(e) => setFormData({ ...formData, secretValue: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                placeholder="Your secret value (will be encrypted)"
                rows={3}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Add Secret
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Secrets List */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Secrets</h3>
          <div className="flex gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="rotation_due">Sort by: Rotation Due</option>
              <option value="name">Sort by: Name</option>
              <option value="created">Sort by: Created</option>
            </select>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-center text-gray-500">Loading...</div>
        ) : sortedSecrets.length === 0 ? (
          <div className="mt-4 text-center text-gray-500">No secrets found</div>
        ) : (
          <div className="mt-4 space-y-2">
            {sortedSecrets.map((secret) => (
              <div
                key={secret.id}
                onClick={() => setSelectedSecret(selectedSecret?.id === secret.id ? null : secret)}
                className="cursor-pointer rounded bg-gray-50 p-4 hover:bg-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg">{getTypeIcon(secret.secretType)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{secret.name}</p>
                      <p className="text-sm text-gray-500">
                        {secret.daysUntilRotation <= 0
                          ? '⚠️ Expired'
                          : `Rotation due in ${secret.daysUntilRotation} days`}
                      </p>
                    </div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(secret.status)}`}>
                      {secret.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedSecret?.id === secret.id && (
                  <div className="mt-4 border-t pt-4 space-y-3">
                    {secret.description && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Description</p>
                        <p className="text-sm text-gray-600">{secret.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Rotation Frequency</p>
                        <p className="text-sm text-gray-900">{secret.rotationFrequencyDays} days</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Next Rotation Due</p>
                        <p className="text-sm text-gray-900">
                          {new Date(secret.nextRotationDueAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Last Rotated</p>
                        <p className="text-sm text-gray-900">
                          {secret.lastRotatedAt
                            ? new Date(secret.lastRotatedAt).toLocaleDateString()
                            : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Created</p>
                        <p className="text-sm text-gray-900">
                          {new Date(secret.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {secret.tags && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Tags</p>
                        <p className="text-sm text-gray-900">{secret.tags}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleMarkRotated(secret.id)}
                        className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        ✓ Mark as Rotated
                      </button>
                      <button
                        onClick={() => handleDeleteSecret(secret.id)}
                        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
