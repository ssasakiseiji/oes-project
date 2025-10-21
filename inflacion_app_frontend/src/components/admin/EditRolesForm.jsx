import React, { useState } from 'react';

export const EditRolesForm = ({ user, onSave, onCancel }) => {
    const [roles, setRoles] = useState(user.roles);
    const allRoles = ['student', 'monitor', 'admin'];
    const handleRoleChange = (role, checked) => {
        if (checked) setRoles(r => [...r, role]);
        else setRoles(r => r.filter(i => i !== role));
    };
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {allRoles.map(role => (
                    <label key={role} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/70 transition">
                        <input
                            type="checkbox"
                            checked={roles.includes(role)}
                            onChange={e => handleRoleChange(role, e.target.checked)}
                            className="h-5 w-5 form-checkbox rounded text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600"
                        />
                        <span className="font-semibold capitalize text-gray-800 dark:text-gray-100">{role}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                    Cancelar
                </button>
                <button
                    onClick={() => onSave(user.id, roles)}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                >
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
};
