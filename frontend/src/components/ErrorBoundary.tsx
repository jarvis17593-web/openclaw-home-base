import React, { ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-red-600">⚠️ Error</h1>
            <p className="mt-4 text-gray-700">Something went wrong:</p>
            <pre className="mt-2 overflow-auto rounded-md bg-gray-100 p-3 text-sm text-gray-800">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
