import React from 'react'
import { CostSummary } from '../types'

interface CostTrackerProps {
  summary: CostSummary | null
  loading: boolean
}

export function CostTracker({ summary, loading }: CostTrackerProps) {
  if (loading || !summary) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-center text-gray-500">Loading costs...</div>
      </div>
    )
  }

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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {/* 24h Cost */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-sm font-medium text-gray-600">24h Cost</div>
        <div className="mt-2 text-3xl font-bold text-gray-900">
          ${summary.total24h.toFixed(2)}
        </div>
      </div>

      {/* 7d Cost */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-sm font-medium text-gray-600">7d Cost</div>
        <div className="mt-2 text-3xl font-bold text-gray-900">
          ${summary.total7d.toFixed(2)}
        </div>
      </div>

      {/* 30d Cost */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-sm font-medium text-gray-600">30d Cost</div>
        <div className="mt-2 text-3xl font-bold text-gray-900">
          ${summary.total30d.toFixed(2)}
        </div>
      </div>

      {/* Avg Daily + Trend */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-sm font-medium text-gray-600">Avg Daily</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            ${summary.avgDaily.toFixed(2)}
          </span>
          <span className="text-2xl">{getTrendIcon(summary.trend)}</span>
        </div>
      </div>
    </div>
  )
}
