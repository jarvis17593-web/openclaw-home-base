/**
 * Shared type definitions for OpenClaw Home Base
 */

export interface Agent {
  id: string
  name: string
  status: 'running' | 'idle' | 'error'
  pid?: number
  lastActivityAt?: number
  createdAt: number
}

export interface Cost {
  id: string
  timestamp: number
  agentId: string
  provider: string
  model: string
  tokensIn: number
  tokensOut: number
  costUsd: number
}

export interface Request {
  id: string
  timestamp: number
  agentId: string
  model: string
  promptTokens: number
  completionTokens: number
  latencyMs: number
  costUsd: number
  status: 'success' | 'error' | 'timeout'
}

export interface ResourceSnapshot {
  id: string
  timestamp: number
  agentId: string
  cpuPercent: number
  memoryRss: number
  memoryPercent: number
  openFds: number
}

export interface Alert {
  id: string
  timestamp: number
  severity: 'info' | 'warning' | 'error' | 'critical'
  type: string
  agentId?: string
  message: string
  acknowledged: boolean
}

export interface HealthCheck {
  id: string
  timestamp: number
  component: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs?: number
}

export interface CostSummary {
  total24h: number
  total7d: number
  total30d: number
  avgDaily: number
  trend: 'up' | 'down' | 'stable'
}

export interface WebSocketMessage {
  type: 'cost' | 'agent' | 'alert' | 'resource' | 'health'
  data: unknown
  timestamp: number
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresIn: number
}
