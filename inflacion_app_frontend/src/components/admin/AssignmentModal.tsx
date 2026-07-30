import { useState } from 'react';
import Select from 'react-select';
import { Users, Store } from 'lucide-react';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

interface StudentOption {
    value: number;
    label: string;
    email: string;
}

interface CommerceOption {
    value: number;
    label: string;
    address: string | null;
}

export interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: { id: number; name: string; email: string }[];
    commerces: { id: number; name: string; address: string | null }[];
    onSave: (studentId: number, commerceIds: number[]) => Promise<void>;
}

export const AssignmentModal = ({ isOpen, onClose, students, commerces, onSave }: AssignmentModalProps) => {
    const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
    const [selectedCommerces, setSelectedCommerces] = useState<CommerceOption[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const studentOptions: StudentOption[] = students.map(s => ({
        value: s.id,
        label: s.name,
        email: s.email
    }));

    const commerceOptions: CommerceOption[] = commerces.map(c => ({
        value: c.id,
        label: c.name,
        address: c.address
    }));

    const handleSave = async () => {
        if (!selectedStudent || selectedCommerces.length === 0) {
            return;
        }

        setIsSaving(true);
        try {
            await onSave(selectedStudent.value, selectedCommerces.map(c => c.value));
            // Reset form
            setSelectedStudent(null);
            setSelectedCommerces([]);
            onClose();
        } catch (error) {
            console.error('Error saving assignment:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setSelectedStudent(null);
        setSelectedCommerces([]);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="rounded-[var(--nc-radius-lg)] w-full max-w-lg sm:max-w-lg">
                <DialogTitle className="text-xl font-medium text-ink">Nueva Asignación</DialogTitle>

                <div className="space-y-5">
                    {/* Select Student */}
                    <div className="field">
                        <label className="flex items-center gap-2">
                            <Users size={16} />
                            Estudiante
                        </label>
                        <Select<StudentOption>
                            value={selectedStudent}
                            onChange={(option) => setSelectedStudent(option)}
                            options={studentOptions}
                            styles={getReactSelectStyles<StudentOption>()}
                            placeholder="Seleccionar estudiante..."
                            isClearable
                            formatOptionLabel={(option) => (
                                <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-muted">{option.email}</div>
                                </div>
                            )}
                        />
                    </div>

                    {/* Select Commerces */}
                    <div className="field">
                        <label className="flex items-center gap-2">
                            <Store size={16} />
                            Comercios
                        </label>
                        <Select<CommerceOption, true>
                            value={selectedCommerces}
                            onChange={(options) => setSelectedCommerces([...options])}
                            options={commerceOptions}
                            styles={getReactSelectStyles<CommerceOption>()}
                            placeholder="Seleccionar comercios..."
                            isMulti
                            isClearable
                            formatOptionLabel={(option) => (
                                <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-muted">{option.address}</div>
                                </div>
                            )}
                        />
                        {selectedCommerces.length > 0 && (
                            <p className="text-xs text-muted mt-2">
                                {selectedCommerces.length} comercio{selectedCommerces.length !== 1 ? 's' : ''} seleccionado{selectedCommerces.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {/* Info message */}
                    <div
                        className="rounded-[var(--nc-radius-md)] p-3 text-sm text-ink/90"
                        style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', border: '1px solid var(--color-accent)' }}
                    >
                        <strong className="text-accent-200">Nota:</strong> Los comercios se agregarán a las asignaciones existentes del estudiante. No se eliminarán asignaciones previas.
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={!selectedStudent || selectedCommerces.length === 0 || isSaving}>
                        {isSaving ? 'Guardando...' : 'Asignar'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
