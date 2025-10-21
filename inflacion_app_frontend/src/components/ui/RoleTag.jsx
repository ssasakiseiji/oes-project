import React from 'react';

export const RoleTag = ({ role }) => {
    const styles = {
        admin: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
        monitor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
        student: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    };
    return <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles[role] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>{role}</span>;
};
