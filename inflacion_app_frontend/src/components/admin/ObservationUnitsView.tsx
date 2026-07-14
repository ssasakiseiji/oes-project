import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, X, Edit, Trash2, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Pagination } from '../ui/Pagination';
import { StudentCommercePopover } from '../ui/StudentCommercePopover';
import type { ObservationUnit, ObservationUnitWithStudents } from '../../types/api';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

interface EditingObservationUnitState {
    id: number | null;
    name: string;
    address: string;
    originalName: string | null;
    originalAddress: string | null;
}

type SortKey = 'id' | 'name' | 'address';

export const ObservationUnitsView = () => {
    const [observationUnits, setObservationUnits] = useState<ObservationUnitWithStudents[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingObservationUnit, setEditingObservationUnit] = useState<EditingObservationUnitState>({ id: null, name: '', address: '', originalName: null, originalAddress: null });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newObservationUnit, setNewObservationUnit] = useState({ name: '', address: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [observationUnitToDelete, setObservationUnitToDelete] = useState<ObservationUnitWithStudents | null>(null);

    // Search, sort, pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const editInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    useEffect(() => {
        fetchObservationUnits();
    }, []);

    // Auto-focus on edit
    useEffect(() => {
        if (editingObservationUnit.id && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingObservationUnit.id]);

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchObservationUnits = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch<ObservationUnitWithStudents[]>('/api/observation-units');
            setObservationUnits(data || []);
        } catch (err) {
            toast.error(`Error al cargar unidades de observación: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ========== OBSERVATION UNITS CRUD ==========
    const handleAddObservationUnit = async () => {
        if (!newObservationUnit.name.trim()) {
            toast.error('El nombre de la unidad de observación no puede estar vacio');
            return;
        }

        if (!newObservationUnit.address.trim()) {
            toast.error('La direccion de la unidad de observación no puede estar vacia');
            return;
        }

        try {
            const response = await apiFetch<ObservationUnit>('/api/observation-units', {
                method: 'POST',
                body: JSON.stringify({
                    name: newObservationUnit.name.trim(),
                    address: newObservationUnit.address.trim()
                })
            });

            setObservationUnits(prev => [...prev, { ...response, assigned_students_count: 0, assigned_students: [] }]);
            toast.success('Unidad de observación creada exitosamente');
            setShowAddModal(false);
            setNewObservationUnit({ name: '', address: '' });
        } catch (err) {
            toast.error(`Error al crear unidad de observación: ${getErrorMessage(err)}`);
        }
    };

    const startEditingObservationUnit = (observationUnit: ObservationUnitWithStudents) => {
        setEditingObservationUnit({
            id: observationUnit.id,
            name: observationUnit.name,
            address: observationUnit.address || '',
            originalName: observationUnit.name,
            originalAddress: observationUnit.address
        });
    };

    const handleSaveObservationUnitEdit = async () => {
        const trimmedName = editingObservationUnit.name.trim();
        const trimmedAddress = editingObservationUnit.address.trim();

        if (trimmedName === editingObservationUnit.originalName && trimmedAddress === editingObservationUnit.originalAddress) {
            toast.info('No se detectaron cambios');
            setEditingObservationUnit({ id: null, name: '', address: '', originalName: null, originalAddress: null });
            return;
        }

        if (!trimmedName) {
            toast.error('El nombre de la unidad de observación no puede estar vacio');
            return;
        }

        if (!trimmedAddress) {
            toast.error('La direccion de la unidad de observación no puede estar vacia');
            return;
        }

        try {
            await apiFetch(`/api/observation-units/${editingObservationUnit.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: trimmedName, address: trimmedAddress })
            });

            setObservationUnits(prev =>
                prev.map(u =>
                    u.id === editingObservationUnit.id
                        ? { ...u, name: trimmedName, address: trimmedAddress }
                        : u
                )
            );

            toast.success('Unidad de observación actualizada exitosamente');
            setEditingObservationUnit({ id: null, name: '', address: '', originalName: null, originalAddress: null });
        } catch (err) {
            toast.error(`Error al actualizar unidad de observación: ${getErrorMessage(err)}`);
        }
    };

    const confirmDeleteObservationUnit = (observationUnit: ObservationUnitWithStudents) => {
        setObservationUnitToDelete(observationUnit);
        setShowDeleteModal(true);
    };

    const handleDeleteObservationUnit = async () => {
        if (!observationUnitToDelete) return;

        try {
            await apiFetch(`/api/observation-units/${observationUnitToDelete.id}`, { method: 'DELETE' });

            setObservationUnits(prev => prev.filter(u => u.id !== observationUnitToDelete.id));
            toast.success('Unidad de observación eliminada exitosamente');
            setShowDeleteModal(false);
            setObservationUnitToDelete(null);
        } catch (err) {
            toast.error(`Error al eliminar unidad de observación: ${getErrorMessage(err)}`);
        }
    };

    const cancelEditing = () => {
        setEditingObservationUnit({ id: null, name: '', address: '', originalName: null, originalAddress: null });
    };

    // ========== SORTING ==========
    const handleSort = (key: SortKey) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // ========== FILTERING & SORTING ==========
    const getFilteredAndSortedData = () => {
        // Filter by search term
        const filtered = observationUnits.filter(unit => {
            const searchLower = searchTerm.toLowerCase();
            return unit.name.toLowerCase().includes(searchLower) ||
                   (unit.address || '').toLowerCase().includes(searchLower);
        });

        // Sort data
        filtered.sort((a, b) => {
            let aValue: string | number = a[sortConfig.key] ?? '';
            let bValue: string | number = b[sortConfig.key] ?? '';

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = String(bValue).toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    // ========== PAGINATION ==========
    const filteredData = getFilteredAndSortedData();
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
            {/* Header with Search and Add Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gestión de Unidades de Observación</h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            disabled={editingObservationUnit.id !== null}
                            placeholder={editingObservationUnit.id ? "Finaliza la edicion para buscar" : "Buscar..."}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={editingObservationUnit.id !== null}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Agregar</span>
                    </button>
                </div>
            </div>

            {/* Observation Units Table */}
            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                                <th
                                    onClick={() => handleSort('id')}
                                    className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        ID
                                        {sortConfig.key === 'id' ? (
                                            sortConfig.direction === 'asc' ?
                                                <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> :
                                                <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                        ) : (
                                            <ArrowUpDown size={14} className="opacity-40" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('name')}
                                    className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        Nombre
                                        {sortConfig.key === 'name' ? (
                                            sortConfig.direction === 'asc' ?
                                                <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> :
                                                <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                        ) : (
                                            <ArrowUpDown size={14} className="opacity-40" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('address')}
                                    className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        Direccion
                                        {sortConfig.key === 'address' ? (
                                            sortConfig.direction === 'asc' ?
                                                <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> :
                                                <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                        ) : (
                                            <ArrowUpDown size={14} className="opacity-40" />
                                        )}
                                    </div>
                                </th>
                                <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Estudiantes Asignados</th>
                                <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        {searchTerm ? 'No se encontraron resultados' : 'No hay unidades de observación registradas'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map(observationUnit => (
                                    <tr
                                        key={observationUnit.id}
                                        className={`border-b border-gray-100 dark:border-gray-700 last:border-none transition-all ${
                                            editingObservationUnit.id === observationUnit.id
                                                ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{observationUnit.id}</td>
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                                            {editingObservationUnit.id === observationUnit.id ? (
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={editingObservationUnit.name}
                                                    onChange={e => setEditingObservationUnit({ ...editingObservationUnit, name: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveObservationUnitEdit();
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                observationUnit.name
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {editingObservationUnit.id === observationUnit.id ? (
                                                <input
                                                    type="text"
                                                    value={editingObservationUnit.address}
                                                    onChange={e => setEditingObservationUnit({ ...editingObservationUnit, address: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveObservationUnitEdit();
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                observationUnit.address
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <StudentCommercePopover
                                                items={observationUnit.assigned_students || []}
                                                type="students"
                                            />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingObservationUnit.id === observationUnit.id ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveObservationUnitEdit}
                                                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                            title="Guardar"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEditingObservationUnit(observationUnit)}
                                                            disabled={editingObservationUnit.id !== null}
                                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Editar"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => confirmDeleteObservationUnit(observationUnit)}
                                                            disabled={editingObservationUnit.id !== null}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            totalItems={filteredData.length}
                            itemsPerPage={itemsPerPage}
                        />
                    )}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            Agregar Unidad de Observación
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={newObservationUnit.name}
                                    onChange={e => setNewObservationUnit({ ...newObservationUnit, name: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newObservationUnit.address) {
                                            handleAddObservationUnit();
                                        }
                                    }}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nombre de la unidad de observación"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Direccion
                                </label>
                                <input
                                    type="text"
                                    value={newObservationUnit.address}
                                    onChange={e => setNewObservationUnit({ ...newObservationUnit, address: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            handleAddObservationUnit();
                                        }
                                    }}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Direccion de la unidad de observación"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewObservationUnit({ name: '', address: '' });
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddObservationUnit}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && observationUnitToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertTriangle size={24} />
                            <h3 className="text-xl font-bold">Confirmar Eliminacion</h3>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300">
                            Estas seguro de que deseas eliminar la unidad de observación{' '}
                            <strong>{observationUnitToDelete.name}</strong>?
                            <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                                Advertencia: no se puede eliminar si ya tiene observaciones registradas (se preservan los datos históricos).
                            </span>
                        </p>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setObservationUnitToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteObservationUnit}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
