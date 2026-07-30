import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser } from '../types/api';

interface RoleContextValue {
    activeRole: string | null;
    switchRole: (newRole: string) => void;
    hasMultipleRoles: boolean;
    availableRoles: string[];
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export const useRole = () => {
    const context = useContext(RoleContext);
    if (!context) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
};

interface RoleProviderProps {
    children: ReactNode;
    user?: Pick<AuthUser, 'roles'> | null;
}

export const RoleProvider = ({ children, user }: RoleProviderProps) => {
    const [activeRole, setActiveRole] = useState<string | null>(null);

    // Initialize active role from localStorage or default to first role
    useEffect(() => {
        if (user && user.roles && user.roles.length > 0) {
            const savedRole = localStorage.getItem('activeRole');

            // Check if saved role is valid for this user
            if (savedRole && user.roles.includes(savedRole)) {
                setActiveRole(savedRole);
            } else {
                // Default role priority: admin > monitor > student
                const rolePriority = ['admin', 'monitor', 'student'];
                const defaultRole = rolePriority.find(role => user.roles.includes(role)) || user.roles[0];
                setActiveRole(defaultRole);
                localStorage.setItem('activeRole', defaultRole);
            }
        }
    }, [user]);

    const switchRole = (newRole: string) => {
        if (user && user.roles && user.roles.includes(newRole)) {
            setActiveRole(newRole);
            localStorage.setItem('activeRole', newRole);
        }
    };

    const hasMultipleRoles = Boolean(user && user.roles && user.roles.length > 1);

    const value: RoleContextValue = {
        activeRole,
        switchRole,
        hasMultipleRoles,
        availableRoles: user?.roles || [],
    };

    return (
        <RoleContext.Provider value={value}>
            {children}
        </RoleContext.Provider>
    );
};
