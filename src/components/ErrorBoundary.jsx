import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import './ErrorBoundary.css'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo
        })
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="page" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '60vh',
                    padding: 'var(--space-xl)'
                }}>
                    <div className="error-boundary">
                        <div className="error-boundary-icon">
                            <AlertTriangle size={48} />
                        </div>
                        <h1 className="error-boundary-title">Une erreur s'est produite</h1>
                        <p className="error-boundary-message">
                            Désolé, quelque chose a mal tourné. Veuillez réessayer.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={this.handleReset}
                            aria-label="Réessayer"
                        >
                            <RefreshCw size={18} />
                            <span>Réessayer</span>
                        </button>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px' }}>
                                <summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    Détails de l'erreur (dev)
                                </summary>
                                <pre style={{ 
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'auto',
                                    fontSize: '0.875rem',
                                    color: 'var(--error)'
                                }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary

