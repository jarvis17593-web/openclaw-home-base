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

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * Fetch all agents from Gateway
   */
  async getAgents(): Promise<Agent[]> {
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
   */
  async getHealth(): Promise<{ status: string; latency: number }> {
    try {
      const start = Date.now();
      const response = await this.request('/health', 'GET');
      const latency = Date.now() - start;
      return { status: response.status || 'unknown', latency };
    } catch (error) {
      logger.error('Gateway health check failed', { error });
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
