/**
 * WebSocket client for real-time updates
 */

import { WebSocketMessage } from '../types'

type MessageHandler = (data: unknown) => void
type ConnectionHandler = (connected: boolean) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private connectionHandlers: Set<ConnectionHandler> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000

  constructor(url: string = 'ws://localhost:3000') {
    this.url = url
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = token ? `${this.url}?token=${token}` : this.url
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.notifyConnectionHandlers(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.notifyConnectionHandlers(false)
          this.attemptReconnect(token)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private attemptReconnect(token?: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      )
      setTimeout(() => {
        this.connect(token).catch((error) => {
          console.error('Reconnection failed:', error)
        })
      }, this.reconnectDelay)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.handlers.get(message.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.data)
        } catch (error) {
          console.error(`Error in handler for ${message.type}:`, error)
        }
      })
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  off(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  onConnection(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler)
  }

  offConnection(handler: ConnectionHandler) {
    this.connectionHandlers.delete(handler)
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected)
      } catch (error) {
        console.error('Error in connection handler:', error)
      }
    })
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsClient = new WebSocketClient()
