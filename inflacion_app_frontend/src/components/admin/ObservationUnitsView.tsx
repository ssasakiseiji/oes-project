import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, X, Edit, Trash2, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Pagination } from '../ui/Pagination';
import { StudentCommercePopover } from '../ui/StudentCommercePopover';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { Button } from '../ui/button';
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

interface ObservationUnitsViewProps {
    projectId: number;
}

export const ObservationUnitsView = ({ projectId }: ObservationUnitsViewProps) => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

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
            const data = await apiFetch<ObservationUnitWithStudents[]>(`/api/observation-units?projectId=${projectId}`);
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
                    address: newObservationUnit.address.trim(),
                    projectId
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
                body: JSON.stringify({ name: trimmedName, address: trimmedAddress, projectId })
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
            await apiFetch(`/api/observation-units/${observationUnitToDelete.id}?projectId=${projectId}`, { method: 'DELETE' });

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

    const SortIcon = ({ sortKey }: { sortKey: SortKey }) =>
        sortConfig.key === sortKey ? (
            sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent-300" /> : <ArrowDown size={14} className="text-accent-300" />
        ) : (
            <ArrowUpDown size={14} className="text-muted opacity-40" />
        );

    return (
        <div className="card elev-sm p-6 space-y-4">
            {/* Header with Search and Add Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-medium text-ink">Gestión de Unidades de Observación</h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            disabled={editingObservationUnit.id !== null}
                            placeholder={editingObservationUnit.id ? "Finaliza la edicion para buscar" : "Buscar..."}
                            className="input pl-10 w-full sm:w-64"
                        />
                    </div>
                    <Button onClick={() => setShowAddModal(true)} disabled={editingObservationUnit.id !== null}>
                        <Plus size={18} />
                        <span className="hidden sm:inline">Agregar</span>
                    </Button>
                </div>
            </div>

            {/* Observation Units Table */}
            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left" style={{ borderColor: 'var(--color-divider)' }}>
                                <th
                                    onClick={() => handleSort('id')}
                                    className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        ID
                                        <SortIcon sortKey="id" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('name')}
                                    className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        Nombre
                                        <SortIcon sortKey="name" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('address')}
                                    className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        Direccion
                                        <SortIcon sortKey="address" />
                                    </div>
                                </th>
                                <th className="py-3 px-4 font-medium text-muted">Estudiantes Asignados</th>
                                <th className="py-3 px-4 font-medium text-muted text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-muted">
                                        {searchTerm ? 'No se encontraron resultados' : 'No hay unidades de observación registradas'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map(observationUnit => (
                                    <tr
                                        key={observationUnit.id}
                                        className={`border-b last:border-none transition-colors ${
                                            editingObservationUnit.id === observationUnit.id
                                                ? 'bg-accent-800/20 ring-1 ring-accent ring-inset'
                                                : 'hover:bg-accent-800/10'
                                        }`}
                                        style={{ borderColor: 'var(--color-divider)' }}
                                    >
                                        <td className="py-3 px-4 text-muted">{observationUnit.id}</td>
                                        <td className="py-3 px-4 text-ink">
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
                                                    className="input"
                                                />
                                            ) : (
                                                observationUnit.name
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-muted">
                                            {editingObservationUnit.id === observationUnit.id ? (
                                                <input
                                                    type="text"
                                                    value={editingObservationUnit.address}
                                                    onChange={e => setEditingObservationUnit({ ...editingObservationUnit, address: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveObservationUnitEdit();
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    className="input"
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
                                            <div className="flex items-center justify-end gap-1">
                                                {editingObservationUnit.id === observationUnit.id ? (
                                                    <>
                                                        <Button variant="ghost" size="icon-sm" onClick={handleSaveObservationUnitEdit} className="text-success hover:bg-success/10" title="Guardar">
                                                            <Check size={18} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon-sm" onClick={cancelEditing} className="text-muted hover:text-ink" title="Cancelar">
                                                            <X size={18} />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => startEditingObservationUnit(observationUnit)}
                                                            disabled={editingObservationUnit.id !== null}
                                                            className="text-accent-300"
                                                            title="Editar"
                                                        >
                                                            <Edit size={18} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => confirmDeleteObservationUnit(observationUnit)}
                                                            disabled={editingObservationUnit.id !== null}
                                                            className="text-danger hover:bg-danger/10"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </Button>
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
            <Dialog open={showAddModal} onOpenChange={(open) => { if (!open) { setShowAddModal(false); setNewObservationUnit({ name: '', address: '' }); } }}>
                <DialogContent className="rounded-[var(--nc-radius-lg)] w-full max-w-md sm:max-w-md">
                    <DialogTitle className="text-xl font-medium text-ink">Agregar Unidad de Observación</DialogTitle>

                    <div className="space-y-3">
                        <div className="field">
                            <label>Nombre</label>
                            <input
                                type="text"
                                value={newObservationUnit.name}
                                onChange={e => setNewObservationUnit({ ...newObservationUnit, name: e.target.value })}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newObservationUnit.address) {
                                        handleAddObservationUnit();
                                    }
                                }}
                                className="input"
                                placeholder="Nombre de la unidad de observación"
                                autoFocus
                            />
                        </div>

                        <div className="field">
                            <label>Direccion</label>
                            <input
                                type="text"
                                value={newObservationUnit.address}
                                onChange={e => setNewObservationUnit({ ...newObservationUnit, address: e.target.value })}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        handleAddObservationUnit();
                                    }
                                }}
                                className="input"
                                placeholder="Direccion de la unidad de observación"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowAddModal(false);
                                setNewObservationUnit({ name: '', address: '' });
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleAddObservationUnit}>Agregar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <AlertDialog open={showDeleteModal} onOpenChange={(open) => { if (!open) { setShowDeleteModal(false); setObservationUnitToDelete(null); } }}>
                <AlertDialogContent className="rounded-[var(--nc-radius-lg)]">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="text-danger" style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}>
                            <AlertTriangle size={20} />
                        </AlertDialogMedia>
                        <AlertDialogTitle className="text-ink">Confirmar Eliminación</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted">
                            ¿Estás seguro de que deseas eliminar la unidad de observación{' '}
                            <strong className="text-ink">{observationUnitToDelete?.name}</strong>?
                            <span className="block mt-2 text-xs text-danger">
                                Advertencia: no se puede eliminar si ya tiene observaciones registradas (se preservan los datos históricos).
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDeleteObservationUnit}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
