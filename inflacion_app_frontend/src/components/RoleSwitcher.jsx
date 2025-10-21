import React, { useState, useRef, useEffect } from 'react';
import { useRole } from '../contexts/RoleContext';
import { ChevronDown, Check, Users, UserCog, GraduationCap, Shield } from 'lucide-react';

const roleConfig = {
    admin: {
        label: 'Administrador',
        icon: Shield,
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        hoverColor: 'hover:bg-purple-200 dark:hover:bg-purple-800/40',
        badgeColor: 'bg-purple-600 dark:bg-purple-500',
    },
    monitor: {
        label: 'Monitor',
        icon: UserCog,
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        hoverColor: 'hover:bg-blue-200 dark:hover:bg-blue-800/40',
        badgeColor: 'bg-blue-600 dark:bg-blue-500',
    },
    student: {
        label: 'Estudiante',
        icon: GraduationCap,
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        hoverColor: 'hover:bg-green-200 dark:hover:bg-green-800/40',
        badgeColor: 'bg-green-600 dark:bg-green-500',
    },
};

export const RoleSwitcher = () => {
    const { activeRole, switchRole, hasMultipleRoles, availableRoles } = useRole();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!activeRole || !hasMultipleRoles) {
        // Show single role badge without dropdown
        if (!activeRole) return null;

        const config = roleConfig[activeRole];
        const Icon = config.icon;

        return (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${config.color} font-medium text-sm`}>
                <Icon size={18} />
                <span>{config.label}</span>
            </div>
        );
    }

    const currentConfig = roleConfig[activeRole];
    const CurrentIcon = currentConfig.icon;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentConfig.color} ${currentConfig.hoverColor} font-medium text-sm transition-all duration-200 border-2 border-transparent hover:border-opacity-50`}
            >
                <CurrentIcon size={18} />
                <span>{currentConfig.label}</span>
                <div className="flex items-center gap-1">
                    {availableRoles.length > 1 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-xs font-bold">
                            +{availableRoles.length - 1}
                        </span>
                    )}
                    <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] animate-fade-in overflow-hidden">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                            <Users size={14} />
                            <span className="font-semibold">Cambiar rol activo</span>
                        </div>
                    </div>
                    <div className="p-2">
                        {availableRoles.map((role) => {
                            const config = roleConfig[role];
                            const Icon = config.icon;
                            const isActive = role === activeRole;

                            return (
                                <button
                                    key={role}
                                    onClick={() => {
                                        switchRole(role);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                        isActive
                                            ? `${config.color} font-semibold`
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-md ${config.color}`}>
                                        <Icon size={18} />
                                    </div>
                                    <span className="flex-1 text-left">{config.label}</span>
                                    {isActive && (
                                        <Check size={18} className="text-current" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                            Tu vista actual: <span className="font-semibold">{currentConfig.label}</span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
