import { useState, useEffect } from 'react';
import LoginPage from './Pages/LoginPage';
import DashboardPage from './Pages/DashboardPage';
import { apiFetch } from './api';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiFetch('/api/me')
        .then(user => setCurrentUser(user))
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);


  const handleLoginSuccess = ({ user, token }) => {
    localStorage.setItem('token', token); // Guarda el token
    setCurrentUser(user);                 // Guarda solo la información del usuario
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <p className="text-xl font-semibold text-gray-600">Verificando sesión...</p>
        </div>
    );
  }

  return (
    <div>
      {currentUser ? (
        <DashboardPage user={currentUser} onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;