import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorTracker } from '../../../backend/src/services/errorTracker'

describe('ErrorTracker', () => {
  let errorTracker: ErrorTracker
  let mockDb: any

  beforeEach(() => {
    // Create mock database
    mockDb = {
      prepare: vi.fn((sql: string) => ({
        run: vi.fn().mockReturnValue({ changes: 1 }),
        get: vi.fn().mockReturnValue({}),
        all: vi.fn().mockReturnValue([]),
      })),
    }

    errorTracker = new ErrorTracker(mockDb)
  })

  describe('categorizeError', () => {
    it('should categorize rate limit errors', () => {
      const type = errorTracker.categorizeError('429', 'Too many requests')
      expect(type).toBe('rate_limit')
    })

    it('should categorize auth errors', () => {
      const type = errorTracker.categorizeError('401', 'Unauthorized')
      expect(type).toBe('auth_error')
    })

    it('should categorize server errors', () => {
      const type = errorTracker.categorizeError('500', 'Internal Server Error')
      expect(type).toBe('server_error')
    })

    it('should categorize timeout errors', () => {
      const type = errorTracker.categorizeError('408', 'Request timeout')
      expect(type).toBe('timeout')
    })

    it('should categorize invalid input errors', () => {
      const type = errorTracker.categorizeError('400', 'Invalid input')
      expect(type).toBe('invalid_input')
    })

    it('should categorize connection errors', () => {
      const type = errorTracker.categorizeError(undefined, 'ECONNREFUSED')
      expect(type).toBe('connection_error')
    })

    it('should return api_error as default', () => {
      const type = errorTracker.categorizeError(undefined, 'Some other error')
      expect(type).toBe('api_error')
    })

    it('should return unknown for empty input', () => {
      const type = errorTracker.categorizeError(undefined, undefined)
      expect(type).toBe('unknown')
    })
  })

  describe('recordError', () => {
    it('should insert an error record', async () => {
      const mockPrepare = vi.fn(() => ({
        run: vi.fn(),
      }))
      mockDb.prepare = mockPrepare

      const error = await errorTracker.recordError(
        'agent-1',
        'rate_limit',
        'Too many requests',
        '429'
      )

      expect(error.id).toBeDefined()
      expect(error.agentId).toBe('agent-1')
      expect(error.errorType).toBe('rate_limit')
      expect(error.resolved).toBe(false)
      expect(error.retryCount).toBe(0)
    })
  })

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      const mockPrepare = vi.fn(() => ({
        run: vi.fn(),
      }))
      mockDb.prepare = mockPrepare

      await errorTracker.incrementRetryCount('error-1')

      expect(mockPrepare).toHaveBeenCalled()
    })
  })

  describe('markResolved', () => {
    it('should mark error as resolved', async () => {
      const mockPrepare = vi.fn(() => ({
        run: vi.fn(),
      }))
      mockDb.prepare = mockPrepare

      await errorTracker.markResolved('error-1', 'Fixed by team')

      expect(mockPrepare).toHaveBeenCalled()
    })
  })

  describe('getSummary', () => {
    it('should return error summary', async () => {
      const mockPrepare = vi.fn()
      const mockStmt = {
        get: vi
          .fn()
          .mockReturnValueOnce({ count: 5 })
          .mockReturnValueOnce({ count: 2 })
          .mockReturnValueOnce({ avg_time: 3600000 }),
        all: vi
          .fn()
          .mockReturnValueOnce([
            { error_type: 'rate_limit', count: 3 },
            { error_type: 'timeout', count: 2 },
          ])
          .mockReturnValueOnce([{ agent_id: 'agent-1', count: 5 }]),
      }
      mockDb.prepare = mockPrepare.mockReturnValue(mockStmt)

      const summary = await errorTracker.getSummary(24)

      expect(summary.total).toBe(5)
      expect(summary.unresolved).toBe(2)
      expect(summary.byType['rate_limit']).toBe(3)
      expect(summary.byAgent['agent-1']).toBe(5)
    })
  })
})
