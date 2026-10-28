import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  mensaje?: string
}

interface State {
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de renderizado capturado:", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">{this.props.mensaje ?? "Algo salió mal al mostrar esta sección."}</p>
        <p className="mt-1 text-sm text-red-600">El resto de la página sigue funcionando. Puedes reintentar o cambiar de pestaña.</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-4 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Reintentar
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
