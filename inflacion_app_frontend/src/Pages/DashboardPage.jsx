import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { LogOut, User, Monitor, Shield, Moon, Sun } from 'lucide-react';
import StudentDashboard from '../components/StudentDashboard';
import MonitorDashboard from '../components/MonitorDashboard';
import AdminDashboard from '../components/AdminDashboard';
import { useTheme } from '../contexts/ThemeContext';

// Opciones para el selector de roles, incluyendo iconos
const roleOptions = {
    student: { value: 'student', label: 'Estudiante', icon: <User size={16} /> },
    monitor: { value: 'monitor', label: 'Monitor', icon: <Monitor size={16} /> },
    admin: { value: 'admin', label: 'Admin', icon: <Shield size={16} /> },
};

// Estilos personalizados para el react-select que funcionan sobre un fondo oscuro
const customSelectStyles = {
    control: (provided) => ({
        ...provided,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '0.75rem',
        color: 'white',
        minWidth: '150px',
        boxShadow: 'none',
        cursor: 'pointer',
        '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.4)',
        }
    }),
    singleValue: (provided) => ({
        ...provided,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: '#1e3a8a', // Un azul oscuro para el menú
        borderRadius: '0.75rem',
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#2563eb' : (state.isFocused ? '#1d4ed8' : 'transparent'),
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (provided) => ({ ...provided, color: 'rgba(255, 255, 255, 0.7)' }),
};

function DashboardPage({ user, onLogout }) {
    const [activeRole, setActiveRole] = useState(user.roles[0]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const { theme, toggleTheme } = useTheme();

    // Cerrar menú cuando se hace click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const renderDashboardByRole = () => {
        // Los dashboards ahora son "sin fondo" para flotar sobre el fondo principal
        switch (activeRole) {
            case 'admin':
                return <AdminDashboard user={user} />;
            case 'monitor':
                return <MonitorDashboard user={user} />;
            case 'student':
                return <StudentDashboard user={user} />;
            default:
                return <p className="text-white">No tienes un rol asignado para ver un panel.</p>;
        }
    };

    const userHasMultipleRoles = user.roles.length > 1;

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-blue-900 text-white font-sans">
            <div className="max-w-screen-2xl mx-auto p-4">
                <header className="flex justify-between items-center mb-6 sm:mb-8 gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">{user.name}</h1>
                        {userHasMultipleRoles ? (
                            <Select
                                value={roleOptions[activeRole]}
                                onChange={(option) => setActiveRole(option.value)}
                                options={user.roles.map(role => roleOptions[role])}
                                styles={customSelectStyles}
                                isSearchable={false}
                                components={{
                                    SingleValue: ({ children, ...props }) => (
                                        <div {...props.innerProps} className="flex items-center gap-2 text-white">
                                            {roleOptions[props.data.value].icon}
                                            <span>{children}</span>
                                        </div>
                                    ),
                                }}
                                formatOptionLabel={({ label, icon }) => (
                                    <div className="flex items-center gap-2">
                                        {icon}
                                        <span>{label}</span>
                                    </div>
                                )}
                            />
                        ) : (
                            <span className="text-sm font-semibold bg-white/10 text-white px-3 py-1 rounded-full capitalize inline-flex items-center gap-2 border border-white/20">
                                {roleOptions[activeRole]?.icon}
                                {roleOptions[activeRole]?.label}
                            </span>
                        )}
                    </div>

                    {/* Menú dropdown en icono de perfil */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="bg-white/10 p-2.5 sm:p-3 rounded-full border border-white/20 hover:bg-white/20 transition-all duration-200 flex-shrink-0"
                            aria-label="Menú de usuario"
                            aria-expanded={isMenuOpen}
                        >
                            <User size={20} className="sm:w-6 sm:h-6" />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden z-50 animate-scale-in">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{roleOptions[activeRole]?.label}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        toggleTheme();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                    <span className="text-sm font-medium">
                                        {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        onLogout();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span className="text-sm font-medium">Cerrar Sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>
                
                <main>
                    {renderDashboardByRole()}
                </main>
            </div>
        </div>
    );
}

export default DashboardPage;