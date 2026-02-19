import React from 'react'
import { ResourceSnapshot } from '../types'

interface ResourceMonitorProps {
  resources: ResourceSnapshot[]
  agentName: string
}

export function ResourceMonitor({ resources, agentName }: ResourceMonitorProps) {
  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <h3 className="text-lg font-semibold text-gray-900">{agentName} - Resources</h3>
        <div className="mt-4 text-center text-gray-500">No resource data available</div>
      </div>
    )
  }

  const latest = resources[0]

  const getPercentColor = (percent: number) => {
    if (percent >= 75) return 'text-red-600'
    if (percent >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getPercentBgColor = (percent: number) => {
    if (percent >= 75) return 'bg-red-100'
    if (percent >= 50) return 'bg-yellow-100'
    return 'bg-green-100'
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h3 className="text-lg font-semibold text-gray-900">{agentName} - Resources</h3>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* CPU */}
        <div>
          <div className="text-sm text-gray-600">CPU</div>
          <div
            className={`mt-2 text-2xl font-bold ${getPercentColor(latest.cpuPercent)}`}
          >
            {latest.cpuPercent.toFixed(1)}%
          </div>
        </div>

        {/* Memory */}
        <div>
          <div className="text-sm text-gray-600">Memory</div>
          <div
            className={`mt-2 text-2xl font-bold ${getPercentColor(latest.memoryPercent)}`}
          >
            {latest.memoryPercent.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {(latest.memoryRss / 1024 / 1024).toFixed(0)} MB
          </div>
        </div>

        {/* Open FDs */}
        <div>
          <div className="text-sm text-gray-600">Open FDs</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{latest.openFds}</div>
        </div>

        {/* Last Update */}
        <div>
          <div className="text-sm text-gray-600">Last Update</div>
          <div className="mt-2 text-sm text-gray-900">
            {new Date(latest.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}
