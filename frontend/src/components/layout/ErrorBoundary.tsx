import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => this.setState({ hasError: false })

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <p className="text-lg font-medium text-gray-200">Algo salió mal.</p>
          <Button variant="secondary" onClick={this.reset}>
            Reintentar
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
