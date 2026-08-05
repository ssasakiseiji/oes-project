import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EmptyState } from './ui/EmptyState';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error no controlado en la aplicación:', error, errorInfo);
        if (typeof window !== 'undefined' && window.Sentry) {
            window.Sentry.captureException(error);
        }
    }

    render() {
        if (this.state.hasError) {
            // Mismo patrón que el resto de los estados sin contenido de la app:
            // sin caja, sin borde y sin acción -- sólo texto sobre el fondo. La
            // recarga la hace el usuario desde el navegador, así que el copy
            // tiene que pedirla explícitamente.
            return (
                <div className="min-h-screen bg-bg flex items-center justify-center p-4">
                    <EmptyState
                        title="Ocurrió un error inesperado"
                        description="La aplicación encontró un problema. Recargá la página desde tu navegador; si el error persiste, contactá al administrador."
                    />
                </div>
            );
        }

        return this.props.children;
    }
}
