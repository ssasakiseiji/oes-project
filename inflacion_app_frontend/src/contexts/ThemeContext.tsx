import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextValue {
    theme: 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // Modo oscuro fijo como predeterminado
    const [theme] = useState<'dark'>('dark');

    useEffect(() => {
        // Aplicar clase dark al documento de forma permanente
        const root = document.documentElement;
        root.classList.add('dark');
        root.classList.remove('light');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme debe usarse dentro de ThemeProvider');
    }
    return context;
};
