import { useState, useEffect, type SyntheticEvent } from 'react';
import { X, User, Mail, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { RoleTag } from '../ui/RoleTag';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import type { AuthUser } from '../../types/api';

export interface UserFormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    roles: string[];
}

interface UserFormErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    roles?: string;
    submit?: string;
}

export type UserManagementModalMode = 'create' | 'edit';

export interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: Pick<AuthUser, 'name'> & { email?: string; roles?: string[] } | null;
    onSave: (formData: UserFormData) => Promise<void>;
    mode?: UserManagementModalMode;
}

export const UserManagementModal = ({ isOpen, onClose, user, onSave, mode = 'edit' }: UserManagementModalProps) => {
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        roles: []
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<UserFormErrors>({});
    const [isSaving, setIsSaving] = useState(false);

    const availableRoles = [
        { value: 'student', label: 'Estudiante' },
        { value: 'monitor', label: 'Monitor' },
        { value: 'admin', label: 'Administrador' }
    ];

    useEffect(() => {
        if (user && mode === 'edit') {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '',
                confirmPassword: '',
                roles: user.roles || []
            });
        } else {
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                roles: []
            });
        }
        setErrors({});
    }, [user, mode, isOpen]);

    const validateForm = () => {
        const newErrors: UserFormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'El email es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        if (mode === 'create') {
            if (!formData.password) {
                newErrors.password = 'La contraseña es requerida';
            } else if (formData.password.length < 6) {
                newErrors.password = 'Mínimo 6 caracteres';
            }

            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Las contraseñas no coinciden';
            }
        }

        if (formData.roles.length === 0) {
            newErrors.roles = 'Debe asignar al menos un rol';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            setErrors({ submit: error instanceof Error ? error.message : 'Error al guardar el usuario' });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleRole = (roleValue: string) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(roleValue)
                ? prev.roles.filter(r => r !== roleValue)
                : [...prev.roles, roleValue]
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent
                showCloseButton={false}
                className="rounded-[var(--nc-radius-lg)] w-full max-w-lg sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                    <DialogTitle className="text-xl font-medium text-ink">
                        {mode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                    </DialogTitle>
                    <button onClick={onClose} className="btn btn-icon btn-secondary rounded-full" aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5">
                    {/* Name */}
                    <div className="field">
                        <label className="flex items-center gap-2">
                            <User size={16} />
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={`input ${errors.name ? 'border-danger' : ''}`}
                            placeholder="Juan Pérez"
                        />
                        {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="field">
                        <label className="flex items-center gap-2">
                            <Mail size={16} />
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className={`input ${errors.email ? 'border-danger' : ''}`}
                            placeholder="usuario@ejemplo.com"
                        />
                        {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                    </div>

                    {/* Password (only for create mode) */}
                    {mode === 'create' && (
                        <>
                            <div className="field">
                                <label className="flex items-center gap-2">
                                    <Lock size={16} />
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        className={`input pr-10 ${errors.password ? 'border-danger' : ''}`}
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-danger text-xs mt-1">{errors.password}</p>}
                            </div>

                            <div className="field">
                                <label className="flex items-center gap-2">
                                    <Lock size={16} />
                                    Confirmar Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className={`input pr-10 ${errors.confirmPassword ? 'border-danger' : ''}`}
                                        placeholder="Repetir contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="text-danger text-xs mt-1">{errors.confirmPassword}</p>}
                            </div>
                        </>
                    )}

                    {/* Roles */}
                    <div className="field">
                        <label className="flex items-center gap-2">
                            <Shield size={16} />
                            Roles del Usuario
                        </label>
                        <div>
                            {availableRoles.map(role => (
                                <label
                                    key={role.value}
                                    className={`flex items-center gap-3 py-3 border-t first:border-t-0 cursor-pointer transition-colors ${
                                        formData.roles.includes(role.value) ? 'bg-accent-800/20' : 'hover:bg-accent-800/10'
                                    }`}
                                    style={{ borderColor: 'var(--color-divider)' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.roles.includes(role.value)}
                                        onChange={() => toggleRole(role.value)}
                                        className="h-4 w-4 rounded accent-accent"
                                    />
                                    <div className="flex-1 font-medium text-ink">{role.label}</div>
                                    {formData.roles.includes(role.value) && <RoleTag role={role.value} />}
                                </label>
                            ))}
                        </div>
                        {errors.roles && <p className="text-danger text-xs mt-2">{errors.roles}</p>}
                    </div>

                    {errors.submit && (
                        <div
                            className="rounded-[var(--nc-radius-md)] p-3 text-sm text-danger"
                            style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', border: '1px solid var(--color-danger)' }}
                        >
                            {errors.submit}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Guardando...' : mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
