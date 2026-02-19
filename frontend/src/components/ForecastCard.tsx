import React, { useState, useEffect } from 'react'
import { apiClient } from '../services/api'

interface ForecastData {
  forecast: {
    forecast7d: number
    forecast30d: number
    projectedMonthEnd: number
    velocity: number
    trend: 'up' | 'down' | 'stable'
    confidenceLevel: number
    variance: number
  }
  current: {
    spend: number
    daysIntoMonth: number
    daysLeftInMonth: number
  }
  budget: {
    monthly: number
    remaining: number
    onTrack: boolean
    statusColor: string
  }
  metadata: {
    costDataPoints: number
    lastUpdated: string
  }
}

interface ForecastCardProps {
  loading?: boolean
}

export function ForecastCard({ loading: initialLoading = false }: ForecastCardProps) {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        setLoading(true)
        const response = await apiClient.getForecast()
        setData(response.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load forecast')
        console.error('Forecast fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchForecast()
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-center text-gray-500">Loading forecast...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow">
        <div className="text-sm font-medium text-red-800">Error loading forecast</div>
        <div className="mt-1 text-xs text-red-700">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-center text-gray-500">No forecast data available</div>
      </div>
    )
  }

  const { forecast, current, budget } = data

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '📈'
      case 'down':
        return '📉'
      default:
        return '➡️'
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence > 0.8) {
      return <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">High Confidence</span>
    } else if (confidence > 0.5) {
      return <span className="inline-block rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">Medium Confidence</span>
    } else {
      return <span className="inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">Low Confidence</span>
    }
  }

  const statusBgColor = {
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
  }[budget.statusColor] || 'bg-gray-50'

  const statusBorderColor = {
    green: 'border-green-200',
    yellow: 'border-yellow-200',
    red: 'border-red-200',
  }[budget.statusColor] || 'border-gray-200'

  const statusTextColor = {
    green: 'text-green-900',
    yellow: 'text-yellow-900',
    red: 'text-red-900',
  }[budget.statusColor] || 'text-gray-900'

  return (
    <div className={`rounded-lg border ${statusBorderColor} ${statusBgColor} p-6 shadow`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-lg font-bold ${statusTextColor}`}>📊 Budget Forecast</h2>
        {getConfidenceBadge(forecast.confidenceLevel)}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Current Month-End Projection */}
        <div className="rounded-lg bg-white p-4">
          <div className="text-sm font-medium text-gray-600">Projected Month-End</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">
              ${forecast.projectedMonthEnd.toFixed(2)}
            </span>
            <span className="text-2xl">{getTrendIcon(forecast.trend)}</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            vs Budget: ${budget.monthly.toFixed(2)}
          </div>
        </div>

        {/* Budget Status */}
        <div className="rounded-lg bg-white p-4">
          <div className="text-sm font-medium text-gray-600">Budget Remaining</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ${budget.remaining.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {current.daysLeftInMonth} days left in month
          </div>
        </div>

        {/* Velocity */}
        <div className="rounded-lg bg-white p-4">
          <div className="text-sm font-medium text-gray-600">Daily Velocity</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ${forecast.velocity.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {forecast.velocity > 0
              ? `~$${(forecast.velocity * current.daysLeftInMonth).toFixed(2)} remaining`
              : 'No spending data'}
          </div>
        </div>
      </div>

      {/* Forecast Details Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded bg-white p-3">
          <div className="text-xs font-medium text-gray-600">7-Day Forecast</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            ${forecast.forecast7d.toFixed(2)}
          </div>
        </div>
        <div className="rounded bg-white p-3">
          <div className="text-xs font-medium text-gray-600">30-Day Forecast</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            ${forecast.forecast30d.toFixed(2)}
          </div>
        </div>
        <div className="rounded bg-white p-3">
          <div className="text-xs font-medium text-gray-600">Trend</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {forecast.trend.charAt(0).toUpperCase() + forecast.trend.slice(1)}
          </div>
        </div>
        <div className="rounded bg-white p-3">
          <div className="text-xs font-medium text-gray-600">On Track</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {budget.onTrack ? '✅ Yes' : '⚠️ No'}
          </div>
        </div>
      </div>

      {/* Data Freshness */}
      <div className="mt-4 text-xs text-gray-500">
        Based on {data.metadata.costDataPoints} cost records • Last updated{' '}
        {new Date(data.metadata.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  )
}
