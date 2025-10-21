import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const RoleContext = createContext();

export const useRole = () => {
    const context = useContext(RoleContext);
    if (!context) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
};

export const RoleProvider = ({ children, user }) => {
    const [activeRole, setActiveRole] = useState(null);

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

    const switchRole = (newRole) => {
        if (user && user.roles && user.roles.includes(newRole)) {
            setActiveRole(newRole);
            localStorage.setItem('activeRole', newRole);
        }
    };

    const hasMultipleRoles = user && user.roles && user.roles.length > 1;

    const value = {
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

RoleProvider.propTypes = {
    children: PropTypes.node.isRequired,
    user: PropTypes.shape({
        roles: PropTypes.arrayOf(PropTypes.string),
    }),
};
