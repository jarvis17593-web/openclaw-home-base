import React, { useState, useEffect } from 'react'
import { useCosts } from '../hooks/useCosts'
import { apiClient } from '../services/api'

interface ChartPoint {
  label: string
  value: number
  isForecast: boolean
}

export function ForecastChart() {
  const { summary } = useCosts('30d')
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forecast, setForecast] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const forecastResponse = await apiClient.getForecast()
        setForecast(forecastResponse.data)

        // Generate mock historical data and forecast projection
        // In a real app, you'd fetch actual cost history from the API
        const mockData: ChartPoint[] = []

        // Generate 30 days of mock historical data (in reality, this would come from actual costs)
        for (let i = 30; i >= 1; i--) {
          const baseValue = 50 + Math.random() * 30
          mockData.push({
            label: `Day ${31 - i}`,
            value: parseFloat(baseValue.toFixed(2)),
            isForecast: false,
          })
        }

        // Add forecast projection (next 7 days)
        const dailyVelocity = forecastResponse.data.forecast.velocity
        for (let i = 1; i <= 7; i++) {
          mockData.push({
            label: `Forecast +${i}d`,
            value: parseFloat(dailyVelocity.toFixed(2)),
            isForecast: true,
          })
        }

        setChartData(mockData)
        setError(null)
      } catch (err) {
        console.error('Chart data fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load chart data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-center text-gray-500">Loading chart...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow">
        <div className="text-sm font-medium text-red-800">Error loading chart</div>
        <div className="mt-1 text-xs text-red-700">{error}</div>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="text-center text-gray-500">No data available</div>
      </div>
    )
  }

  // Simple SVG-based line chart
  const width = 600
  const height = 300
  const padding = 40
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Find min/max for scaling
  const values = chartData.map((d) => d.value)
  const minValue = Math.min(...values, 0)
  const maxValue = Math.max(...values, 100)
  const range = maxValue - minValue || 1

  // Calculate points for the path
  const points = chartData.map((data, i) => {
    const x = padding + (i / (chartData.length - 1)) * chartWidth
    const y = padding + chartHeight - ((data.value - minValue) / range) * chartHeight
    return { x, y, ...data }
  })

  // Create path string for historical and forecast
  const historicalPoints = points.filter((p) => !p.isForecast)
  const forecastPoints = [historicalPoints[historicalPoints.length - 1], ...points.filter((p) => p.isForecast)]

  const historicalPath = historicalPoints.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')

  const forecastPath =
    forecastPoints.length > 0
      ? forecastPoints.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
      : ''

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">📈 30-Day Cost Trend & 7-Day Forecast</h2>
        <p className="mt-1 text-sm text-gray-600">
          Historical spend (solid line) + Forecasted projection (dashed line)
        </p>
      </div>

      <svg width={width} height={height} className="mx-auto border border-gray-100">
        {/* Grid lines */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = padding + (chartHeight / 4) * i
          return (
            <line
              key={`grid-${i}`}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
          )
        })}

        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ccc" strokeWidth="2" />

        {/* X-axis */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ccc" strokeWidth="2" />

        {/* Y-axis labels */}
        {Array.from({ length: 5 }).map((_, i) => {
          const value = minValue + ((maxValue - minValue) * i) / 4
          const y = padding + ((4 - i) * chartHeight) / 4
          return (
            <text key={`label-${i}`} x={padding - 10} y={y} textAnchor="end" fontSize="12" fill="#666">
              ${value.toFixed(0)}
            </text>
          )
        })}

        {/* Historical path */}
        <path d={historicalPath} fill="none" stroke="#3b82f6" strokeWidth="2" />

        {/* Forecast path (dashed) */}
        {forecastPath && (
          <path d={forecastPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" />
        )}

        {/* Data points - historical */}
        {historicalPoints.map((point, i) => (
          <circle key={`point-hist-${i}`} cx={point.x} cy={point.y} r="3" fill="#3b82f6" />
        ))}

        {/* Data points - forecast */}
        {forecastPoints.map((point, i) => (
          <circle
            key={`point-forecast-${i}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={point.isForecast ? '#ef4444' : '#3b82f6'}
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 bg-blue-500"></div>
          <span className="text-gray-700">Historical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 border-b-2 border-dashed border-red-500"></div>
          <span className="text-gray-700">Forecast</span>
        </div>
      </div>

      {/* Summary */}
      {forecast && (
        <div className="mt-4 rounded bg-gray-50 p-3">
          <p className="text-xs text-gray-600">
            <strong>Velocity:</strong> ${forecast.forecast.velocity.toFixed(2)}/day •{' '}
            <strong>7-Day Forecast:</strong> ${forecast.forecast.forecast7d.toFixed(2)} •{' '}
            <strong>Trend:</strong> {forecast.forecast.trend}
          </p>
        </div>
      )}
    </div>
  )
}
