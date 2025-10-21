import React, { useState } from 'react';
import Select from 'react-select';
import { X, Users, Store } from 'lucide-react';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';

export const AssignmentModal = ({ isOpen, onClose, students, commerces, onSave }) => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedCommerces, setSelectedCommerces] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const isDark = document.documentElement.classList.contains('dark');

    const studentOptions = students.map(s => ({
        value: s.id,
        label: s.name,
        email: s.email
    }));

    const commerceOptions = commerces.map(c => ({
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nueva Asignación</h3>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6 space-y-5">
                    {/* Select Student */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            <Users size={16} />
                            Estudiante
                        </label>
                        <Select
                            value={selectedStudent}
                            onChange={setSelectedStudent}
                            options={studentOptions}
                            styles={getReactSelectStyles(isDark)}
                            placeholder="Seleccionar estudiante..."
                            isClearable
                            formatOptionLabel={(option) => (
                                <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{option.email}</div>
                                </div>
                            )}
                        />
                    </div>

                    {/* Select Commerces */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            <Store size={16} />
                            Comercios
                        </label>
                        <Select
                            value={selectedCommerces}
                            onChange={setSelectedCommerces}
                            options={commerceOptions}
                            styles={getReactSelectStyles(isDark)}
                            placeholder="Seleccionar comercios..."
                            isMulti
                            isClearable
                            formatOptionLabel={(option) => (
                                <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{option.address}</div>
                                </div>
                            )}
                        />
                        {selectedCommerces.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {selectedCommerces.length} comercio{selectedCommerces.length !== 1 ? 's' : ''} seleccionado{selectedCommerces.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {/* Info message */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            <strong>Nota:</strong> Los comercios se agregarán a las asignaciones existentes del estudiante. No se eliminarán asignaciones previas.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                    <button
                        onClick={handleClose}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedStudent || selectedCommerces.length === 0 || isSaving}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Guardando...' : 'Asignar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
