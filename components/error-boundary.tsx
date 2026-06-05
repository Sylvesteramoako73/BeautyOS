'use client'
import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center px-6 gap-4">
          <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Something went wrong</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              {this.state.error.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-secondary"
          >
            <RefreshCw className="h-5 w-5" /> Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
