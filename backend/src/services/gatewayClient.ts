/**
 * Gateway Client Service
 * Fetches agent status, cost data, and resource metrics from OpenClaw Gateway
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import { logger } from '../config/logger';
import { env } from '../config/env-validator';

export interface Agent {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error';
  pid?: number;
  lastActivityAt?: number;
  createdAt: number;
}

export interface CostData {
  timestamp: number;
  agentId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface ResourceData {
  timestamp: number;
  agentId: string;
  cpuPercent: number;
  memoryRss: number;
  memoryPercent: number;
  openFds: number;
}

/**
 * GatewayClient manages communication with OpenClaw Gateway API
 */
export class GatewayClient {
  private baseUrl: string;
  private authToken: string;
  private requestQueue: Array<{
    path: string;
    method: string;
    resolve: (data: any) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;
  private readonly RATE_LIMIT_MS = 100; // 10 requests/second max
  private isDev: boolean;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.isDev = process.env.NODE_ENV === 'development';
  }

  /**
   * Fetch all agents from Gateway
   */
  async getAgents(): Promise<Agent[]> {
    if (this.isDev) {
      return this.getMockAgents();
    }
    try {
      const response = await this.request('/agents', 'GET');
      return response.data || [];
    } catch (error) {
      logger.error('Failed to fetch agents', { error });
      return [];
    }
  }

  /**
   * Fetch cost data for agents
   */
  async getCosts(agentId?: string): Promise<CostData[]> {
    if (this.isDev) {
      return this.getMockCosts(agentId);
    }
    try {
      const path = agentId ? `/costs?agentId=${agentId}` : '/costs';
      const response = await this.request(path, 'GET');
      return response.data || [];
    } catch (error) {
      logger.error('Failed to fetch costs', { agentId, error });
      return [];
    }
  }

  /**
   * Fetch resource metrics for agents
   */
  async getResources(agentId?: string): Promise<ResourceData[]> {
    if (this.isDev) {
      return this.getMockResources(agentId);
    }
    try {
      const path = agentId ? `/resources?agentId=${agentId}` : '/resources';
      const response = await this.request(path, 'GET');
      return response.data || [];
    } catch (error) {
      logger.error('Failed to fetch resources', { agentId, error });
      return [];
    }
  }

  /**
   * Fetch gateway health status
   * Simple connectivity check - if gateway responds to any request, it's up
   */
  async getHealth(): Promise<{ status: string; latency: number }> {
    try {
      const start = Date.now();
      // Simple connectivity check: just verify we can reach the gateway
      await new Promise<void>((resolve, reject) => {
        const url = new URL(this.baseUrl);
        const protocol = url.protocol === 'https:' ? https : http;
        const request = protocol.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
          resolve();
        });
        request.on('error', reject);
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Timeout'));
        });
        request.end();
      });
      const latency = Date.now() - start;
      return { status: 'up', latency };
    } catch (error) {
      logger.error('Gateway health check failed', { error: (error as Error).message });
      return { status: 'down', latency: -1 };
    }
  }

  /**
   * Make HTTP request with rate limiting
   */
  private request(
    path: string,
    method: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ path, method, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const item = this.requestQueue.shift();
      if (!item) break;

      try {
        const response = await this.makeRequest(item.path, item.method);
        item.resolve(response);
      } catch (error) {
        item.reject(error as Error);
      }

      // Rate limiting: wait before next request
      if (this.requestQueue.length > 0) {
        await this.sleep(this.RATE_LIMIT_MS);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Perform actual HTTP request
   */
  private makeRequest(path: string, method: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.baseUrl + path);
        const protocol = url.protocol === 'https:' ? https : http;
        const options = {
          method,
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        };

        const request = protocol.request(url, options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(parsed);
              } else {
                reject(
                  new Error(
                    `Gateway returned ${res.statusCode}: ${parsed.message || 'Unknown error'}`
                  )
                );
              }
            } catch (e) {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          });
        });

        request.on('error', (error) => {
          reject(new Error(`Request failed: ${(error as Error).message}`));
        });

        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Gateway request timeout'));
        });

        request.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Mock data for development - agents
   */
  private getMockAgents(): Agent[] {
    return [
      {
        id: 'main',
        name: 'main',
        status: 'running',
        pid: process.pid,
        lastActivityAt: Date.now() - 5000,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'sandbox',
        name: 'sandbox',
        status: 'idle',
        pid: process.pid + 1,
        lastActivityAt: Date.now() - 60000,
        createdAt: Date.now() - 172800000,
      },
    ];
  }

  /**
   * Mock data for development - costs
   */
  private getMockCosts(agentId?: string): CostData[] {
    const now = Date.now();
    const mockCosts: CostData[] = [];

    // Generate 30 days of mock cost data
    for (let i = 0; i < 30; i++) {
      const timestamp = now - i * 86400000;
      mockCosts.push(
        {
          timestamp,
          agentId: 'main',
          provider: 'openai',
          model: 'gpt-4-turbo',
          tokensIn: 2000,
          tokensOut: 1000,
          costUsd: 0.12,
        },
        {
          timestamp,
          agentId: 'sandbox',
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          tokensIn: 1500,
          tokensOut: 800,
          costUsd: 0.08,
        }
      );
    }

    return agentId
      ? mockCosts.filter((c) => c.agentId === agentId)
      : mockCosts;
  }

  /**
   * Mock data for development - resources
   */
  private getMockResources(agentId?: string): ResourceData[] {
    const now = Date.now();
    const mockResources: ResourceData[] = [];

    // Generate 24 hours of mock resource data
    for (let i = 0; i < 24; i++) {
      const timestamp = now - i * 3600000;
      mockResources.push(
        {
          timestamp,
          agentId: 'main',
          cpuPercent: 15 + Math.random() * 30,
          memoryRss: 256 * 1024 * 1024,
          memoryPercent: 25 + Math.random() * 15,
          openFds: 50 + Math.floor(Math.random() * 30),
        },
        {
          timestamp,
          agentId: 'sandbox',
          cpuPercent: 5 + Math.random() * 15,
          memoryRss: 128 * 1024 * 1024,
          memoryPercent: 12 + Math.random() * 8,
          openFds: 30 + Math.floor(Math.random() * 20),
        }
      );
    }

    return agentId
      ? mockResources.filter((r) => r.agentId === agentId)
      : mockResources;
  }

  /**
   * Utility: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let instance: GatewayClient | null = null;

export function getGatewayClient(): GatewayClient {
  if (!instance) {
    const baseUrl = env.GATEWAY_URL || 'https://localhost:18789';
    const authToken = env.GATEWAY_AUTH_TOKEN;
    instance = new GatewayClient(baseUrl, authToken);
  }
  return instance;
}
