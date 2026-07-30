import { useState } from 'react';
import { Button } from '../ui/button';
import type { User } from '../../types/api';

export interface EditRolesFormProps {
    user: Pick<User, 'id' | 'roles'>;
    onSave: (userId: number, roles: string[]) => void;
    onCancel: () => void;
}

export const EditRolesForm = ({ user, onSave, onCancel }: EditRolesFormProps) => {
    const [roles, setRoles] = useState<string[]>(user.roles);
    const allRoles = ['student', 'monitor', 'admin'];
    const handleRoleChange = (role: string, checked: boolean) => {
        if (checked) setRoles(r => [...r, role]);
        else setRoles(r => r.filter(i => i !== role));
    };
    return (
        <div className="space-y-4">
            <div>
                {allRoles.map(role => (
                    <label key={role} className="flex items-center gap-3 py-3 border-t first:border-t-0 cursor-pointer hover:text-accent transition-colors" style={{ borderColor: 'var(--color-divider)' }}>
                        <input
                            type="checkbox"
                            checked={roles.includes(role)}
                            onChange={e => handleRoleChange(role, e.target.checked)}
                            className="h-4 w-4 rounded accent-accent"
                        />
                        <span className="font-semibold capitalize">{role}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button onClick={() => onSave(user.id, roles)}>Guardar Cambios</Button>
            </div>
        </div>
    );
};
