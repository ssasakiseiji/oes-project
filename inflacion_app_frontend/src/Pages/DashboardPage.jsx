import React, { useState } from 'react';
import Select from 'react-select';
import { LogOut, User, Monitor, Shield } from 'lucide-react';
import StudentDashboard from '../components/StudentDashboard';
import MonitorDashboard from '../components/MonitorDashboard';
import AdminDashboard from '../components/AdminDashboard';

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
            <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 md:p-8">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-3 rounded-full border border-white/20">
                            <User size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">{user.name}</h1>
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
                    </div>
                    <button 
                        onClick={onLogout}
                        className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg shadow-md hover:bg-white/20 transition"
                    >
                        <LogOut size={18} className="mr-2" />
                        Cerrar Sesión
                    </button>
                </header>
                
                <main>
                    {renderDashboardByRole()}
                </main>
            </div>
        </div>
    );
}

export default DashboardPage;