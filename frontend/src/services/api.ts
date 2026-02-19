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
        window.location.href = '/login'
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
}

export const apiClient = new APIClient()
