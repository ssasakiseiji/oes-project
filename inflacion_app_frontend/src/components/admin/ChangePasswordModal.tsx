import { useState, type SyntheticEvent } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

interface ChangePasswordErrors {
    password?: string;
    confirmPassword?: string;
    submit?: string;
}

export interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: { name: string } | null;
    onSave: (password: string) => Promise<void>;
}

export const ChangePasswordModal = ({ isOpen, onClose, user, onSave }: ChangePasswordModalProps) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<ChangePasswordErrors>({});
    const [isSaving, setIsSaving] = useState(false);

    const validateForm = () => {
        const newErrors: ChangePasswordErrors = {};

        if (!password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSaving(true);
        try {
            await onSave(password);
            setPassword('');
            setConfirmPassword('');
            onClose();
        } catch (error) {
            setErrors({ submit: error instanceof Error ? error.message : 'Error al cambiar la contraseña' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setPassword('');
        setConfirmPassword('');
        setErrors({});
        onClose();
    };

    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="rounded-[var(--nc-radius-lg)] w-full max-w-md sm:max-w-md">
                <div>
                    <DialogTitle className="text-xl font-medium text-ink">Cambiar Contraseña</DialogTitle>
                    <p className="text-sm text-muted mt-1">{user.name}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Warning */}
                    <div
                        className="rounded-[var(--nc-radius-md)] p-3 flex gap-3 text-sm text-ink/90"
                        style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', border: '1px solid var(--color-accent)' }}
                    >
                        <AlertCircle className="text-accent-200 flex-shrink-0" size={20} />
                        <p>Esta acción cambiará la contraseña del usuario. Asegúrate de comunicársela de forma segura.</p>
                    </div>

                    {/* New Password */}
                    <div className="field">
                        <label className="flex items-center gap-2">
                            <Lock size={16} />
                            Nueva Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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

                    {/* Confirm Password */}
                    <div className="field">
                        <label className="flex items-center gap-2">
                            <Lock size={16} />
                            Confirmar Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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

                    {errors.submit && (
                        <div
                            className="rounded-[var(--nc-radius-md)] p-3 text-sm text-danger"
                            style={{ background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', border: '1px solid var(--color-danger)' }}
                        >
                            {errors.submit}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={handleClose} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Cambiando...' : 'Cambiar Contraseña'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
