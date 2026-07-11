import { Component, type ErrorInfo, type ReactNode } from 'react';

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

    handleReload = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                        <h1 className="text-xl font-bold text-gray-800 mb-2">Ocurrió un error inesperado</h1>
                        <p className="text-gray-600 mb-6">
                            La aplicación encontró un problema. Intentá recargar la página; si el error persiste, contactá al administrador.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Recargar página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
