/**
 * API client for OpenClaw Home Base backend
 */

import { Agent, Cost, Request, ResourceSnapshot, Alert, HealthCheck } from '../types'

const API_BASE = '/api'

class APIClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
    this.loadToken()
  }

  private loadToken() {
    const stored = localStorage.getItem('authToken')
    if (stored) {
      this.token = stored
    }
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('authToken', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('authToken')
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        // Only redirect to login in production
        if (process.env.NODE_ENV === 'production') {
          window.location.href = '/login'
        }
      }
      throw new Error(`API error: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    return this.request('GET', '/agents')
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request('GET', `/agents/${id}`)
  }

  // Costs
  async getCosts(agentId?: string): Promise<Cost[]> {
    const path = agentId ? `/costs?agentId=${agentId}` : '/costs'
    return this.request('GET', path)
  }

  async getCostSummary(period: '24h' | '7d' | '30d'): Promise<{
    total: number
    avgDaily: number
    trend: string
  }> {
    return this.request('GET', `/costs/summary?period=${period}`)
  }

  // Requests
  async getRequests(agentId?: string, limit: number = 100): Promise<Request[]> {
    const path = agentId
      ? `/requests?agentId=${agentId}&limit=${limit}`
      : `/requests?limit=${limit}`
    return this.request('GET', path)
  }

  // Resources
  async getResources(agentId: string): Promise<ResourceSnapshot[]> {
    return this.request('GET', `/resources/${agentId}`)
  }

  // Alerts
  async getAlerts(unreadOnly: boolean = false): Promise<Alert[]> {
    const path = unreadOnly ? '/alerts?unread=true' : '/alerts'
    return this.request('GET', path)
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    return this.request('POST', `/alerts/${alertId}/acknowledge`)
  }

  // Health
  async getHealth(): Promise<HealthCheck[]> {
    return this.request('GET', '/health')
  }

  // Errors
  async getErrors(hoursBack: number = 24, limit: number = 100): Promise<any> {
    return this.request('GET', `/errors?hoursBack=${hoursBack}&limit=${limit}`)
  }

  async getErrorStats(hoursBack: number = 24): Promise<any> {
    return this.request('GET', `/errors/stats?hoursBack=${hoursBack}`)
  }

  async getErrorTrends(hoursBack: number = 24): Promise<any> {
    return this.request('GET', `/errors/trends?hoursBack=${hoursBack}`)
  }

  async recordError(
    agentId: string,
    errorType: string,
    errorMessage: string,
    errorCode?: string
  ): Promise<any> {
    return this.request('POST', '/errors', {
      agentId,
      errorType,
      errorMessage,
      errorCode,
    })
  }

  async resolveError(errorId: string, resolutionNotes?: string): Promise<void> {
    return this.request('PUT', `/errors/${errorId}/resolve`, {
      resolutionNotes,
    })
  }

  // Forecasts
  async getForecast(): Promise<{
    data: {
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
  }> {
    return this.request('GET', '/forecasts')
  }

  async get7DayForecast(): Promise<{
    data: {
      forecast: number
      velocity: number
      costDataPoints: number
    }
  }> {
    return this.request('GET', '/forecasts/7d')
  }

  async get30DayForecast(): Promise<{
    data: {
      forecast: number
      velocity: number
      costDataPoints: number
    }
  }> {
    return this.request('GET', '/forecasts/30d')
  }

  async getTrendAnalysis(): Promise<{
    data: {
      trend: 'up' | 'down' | 'stable'
      variance: number
      confidence: number
      costDataPoints: number
    }
  }> {
    return this.request('GET', '/forecasts/trend')
  }

  async getMonthEndForecast(): Promise<{
    data: {
      current: number
      projected: number
      budget: number
      remaining: number
      projectedOverBudget: number
      daysIntoMonth: number
      daysLeft: number
    }
  }> {
    return this.request('GET', '/forecasts/month-end')
  }

  async getConfidenceMetrics(): Promise<{
    data: {
      confidenceLevel: number
      historicalVariance: number
      velocity: number
      interpretation: string
    }
  }> {
    return this.request('GET', '/forecasts/confidence')
  }

  // Generic API method for custom requests
  async getAPI(path: string, options?: { method?: string; body?: string }): Promise<any> {
    const method = options?.method || 'GET'
    if (method === 'GET') {
      return this.request('GET', path)
    } else if (method === 'POST') {
      return this.request('POST', path, options?.body ? JSON.parse(options.body) : undefined)
    } else if (method === 'PUT') {
      return this.request('PUT', path, options?.body ? JSON.parse(options.body) : undefined)
    }
    throw new Error(`Unsupported method: ${method}`)
  }
}

export const apiClient = new APIClient()
