import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import LoginPage from './Pages/LoginPage';
import DashboardPage from './Pages/DashboardPage';
import { apiFetch, SESSION_EXPIRED_EVENT } from './api';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { queryClient } from './lib/queryClient';
import type { AuthUser, LoginResponse } from './types/api';

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiFetch<AuthUser>('/api/me')
        .then(user => setCurrentUser(user))
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // La sesión se cae sola cuando vence el token (8h, ver auth.service.ts) y
  // api.ts avisa por evento en vez de recargar el documento. Devolver al login
  // acá -- en el mismo render, sin navegación -- es lo que evita el ciclo de
  // recarga + autocompletado que dejaba el formulario inservible hasta un
  // refresh duro.
  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
      // El cache es del usuario que se fue: sin esto la próxima sesión arranca
      // leyendo datos de la anterior.
      queryClient.clear();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const handleLoginSuccess = ({ user, token }: LoginResponse) => {
    localStorage.setItem('token', token); // Guarda el token
    setCurrentUser(user);                 // Guarda solo la información del usuario
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
            <p className="text-xl font-semibold text-muted">Verificando sesión...</p>
        </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <div>
            {currentUser ? (
              <DashboardPage user={currentUser} onLogout={handleLogout} />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )}
          </div>
        </ToastProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
