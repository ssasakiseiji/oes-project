import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    success: (message: string, duration?: number) => number;
    error: (message: string, duration?: number) => number;
    warning: (message: string, duration?: number) => number;
    info: (message: string, duration?: number) => number;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
};

interface ToastProps {
    id: number;
    message: string;
    type: ToastType;
    onClose: (id: number) => void;
}

const Toast = ({ id, message, type, onClose }: ToastProps) => {
  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />
  };

  const styles: Record<ToastType, string> = {
    success: 'bg-green-500 dark:bg-green-600 text-white border-2 border-green-400 dark:border-green-500',
    error: 'bg-red-500 dark:bg-red-600 text-white border-2 border-red-400 dark:border-red-500',
    warning: 'bg-amber-500 dark:bg-amber-600 text-white border-2 border-amber-400 dark:border-amber-500',
    info: 'bg-blue-500 dark:bg-blue-600 text-white border-2 border-blue-400 dark:border-blue-500'
  };

  return (
    <div
      className={`${styles[type]} rounded-xl shadow-xl p-4 mb-3 flex items-center justify-between gap-3 min-w-[300px] max-w-md animate-slide-in backdrop-blur-sm`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        <p className="font-semibold text-sm">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 hover:bg-white/20 rounded-full p-1.5 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toast: ToastContextValue = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={removeToast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};
