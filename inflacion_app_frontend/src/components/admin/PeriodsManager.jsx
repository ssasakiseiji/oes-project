import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Loader, Search, Edit, ArrowUp, ArrowDown, ArrowUpDown, Plus, X, Save } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/TableSkeleton';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import { Pagination } from '../ui/Pagination';

export const PeriodsManager = () => {
    const [periods, setPeriods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'year', direction: 'desc' });
    const [editingPeriod, setEditingPeriod] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const [newPeriod, setNewPeriod] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        start_date: '',
        end_date: ''
    });

    const itemsPerPage = 10;
    const toast = useToast();

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        name: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
    })), []);

    const years = useMemo(() => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + 1 - i), []);

    // Auto-calculate suggested dates
    useEffect(() => {
        const d = new Date(newPeriod.year, newPeriod.month - 1, 25);
        const startDate = d.toISOString().split('T')[0];
        d.setMonth(d.getMonth() + 1);
        d.setDate(3);
        const endDate = d.toISOString().split('T')[0];
        setNewPeriod(p => ({...p, start_date: startDate, end_date: endDate}));
    }, [newPeriod.month, newPeriod.year]);

    const fetchPeriods = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/api/periods');
            setPeriods(data);
        } catch (err) {
            toast.error(`Error al cargar períodos: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPeriods(); }, []);

    // Check for periods that should auto-close
    useEffect(() => {
        const checkPeriodsToClose = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            periods.forEach(period => {
                if (period.status === 'Open') {
                    const endDate = new Date(period.end_date);
                    endDate.setHours(0, 0, 0, 0);

                    if (endDate < today) {
                        handleUpdateStatus(period.id, 'Closed', true);
                    }
                }
            });
        };

        if (periods.length > 0) {
            checkPeriodsToClose();
        }
    }, [periods]);

    const handleCreatePeriod = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        const monthName = months.find(m => m.value === newPeriod.month)?.name;
        const periodToCreate = {
            ...newPeriod,
            name: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${newPeriod.year}`
        };

        try {
            await apiFetch('/api/periods', { method: 'POST', body: JSON.stringify(periodToCreate) });
            toast.success('Período creado exitosamente');
            setShowCreateForm(false);
            fetchPeriods();
        } catch (err) {
            toast.error(`Error al crear período: ${err.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateStatus = async (periodId, newStatus, isAutoClose = false) => {
        try {
            await apiFetch(`/api/periods/${periodId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            if (!isAutoClose) {
                toast.success('Estado del período actualizado');
            } else {
                toast.info('Período cerrado automáticamente por fecha de cierre');
            }

            fetchPeriods();
        } catch (err) {
            toast.error(`Error al actualizar estado: ${err.message}`);
        }
    };

    const handleEditPeriod = (period) => {
        setEditingPeriod({
            ...period,
            start_date: period.start_date.split('T')[0],
            end_date: period.end_date.split('T')[0]
        });
    };

    const handleSaveEdit = async () => {
        try {
            // Validate dates
            const startDate = new Date(editingPeriod.start_date);
            const endDate = new Date(editingPeriod.end_date);

            if (endDate <= startDate) {
                toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
                return;
            }

            // Update period (you'll need to add this endpoint)
            await apiFetch(`/api/periods/${editingPeriod.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    start_date: editingPeriod.start_date,
                    end_date: editingPeriod.end_date
                })
            });

            toast.success('Período actualizado exitosamente');
            setEditingPeriod(null);
            fetchPeriods();
        } catch (err) {
            toast.error(`Error al actualizar período: ${err.message}`);
        }
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getStatusBadge = (status) => {
        const styles = {
            'Open': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
            'Closed': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
            'Scheduled': 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        };
        const tooltips = {
            'Open': 'Período activo - Los estudiantes pueden registrar precios',
            'Closed': 'Período cerrado - Ya no se pueden registrar precios',
            'Scheduled': 'Período programado - Aún no está activo'
        };
        return (
            <Tooltip content={tooltips[status]}>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles[status]}`}>{status}</span>
            </Tooltip>
        );
    };

    // Filter and sort
    const filteredPeriods = useMemo(() => {
        return periods.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [periods, searchTerm]);

    const sortedPeriods = useMemo(() => {
        let sorted = [...filteredPeriods];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'year' || sortConfig.key === 'month') {
                    aValue = parseInt(aValue);
                    bValue = parseInt(bValue);
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredPeriods, sortConfig]);

    const paginatedPeriods = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedPeriods.slice(start, start + itemsPerPage);
    }, [sortedPeriods, currentPage]);

    const totalPages = Math.ceil(sortedPeriods.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Períodos' }]} />

            {/* Create Period Form */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {showCreateForm ? 'Crear Nuevo Período' : 'Períodos de Recolección'}
                    </h3>
                    {!showCreateForm && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <Plus size={18} />
                            Nuevo Período
                        </button>
                    )}
                </div>

                {showCreateForm && (
                    <form onSubmit={handleCreatePeriod} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Mes</label>
                                <select
                                    value={newPeriod.month}
                                    onChange={e => setNewPeriod({...newPeriod, month: parseInt(e.target.value)})}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 w-full"
                                >
                                    {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Año</label>
                                <select
                                    value={newPeriod.year}
                                    onChange={e => setNewPeriod({...newPeriod, year: parseInt(e.target.value)})}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 w-full"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={newPeriod.start_date}
                                    onChange={e => setNewPeriod({...newPeriod, start_date: e.target.value})}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={newPeriod.end_date}
                                    onChange={e => setNewPeriod({...newPeriod, end_date: e.target.value})}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition flex items-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader className="animate-spin" size={16} />
                                        Creando...
                                    </>
                                ) : (
                                    'Crear Período'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Periods Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Historial de Períodos</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar períodos..."
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <TableSkeleton rows={5} columns={5} />
                ) : filteredPeriods.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title="No hay períodos registrados"
                        description="Crea tu primer período para comenzar a recopilar datos de precios."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th
                                            onClick={() => handleSort('name')}
                                            className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                Nombre
                                                {sortConfig.key === 'name' ? (
                                                    sortConfig.direction === 'asc' ?
                                                        <ArrowUp size={14} className="text-blue-600" /> :
                                                        <ArrowDown size={14} className="text-blue-600" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('status')}
                                            className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                Estado
                                                {sortConfig.key === 'status' ? (
                                                    sortConfig.direction === 'asc' ?
                                                        <ArrowUp size={14} className="text-blue-600" /> :
                                                        <ArrowDown size={14} className="text-blue-600" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-3 text-gray-500 dark:text-gray-400">Fechas</th>
                                        <th className="p-3 text-right text-gray-500 dark:text-gray-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPeriods.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-none transition-all">
                                        <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{p.name}</td>
                                        <td className="p-3">{getStatusBadge(p.status)}</td>
                                        <td className="p-3">
                                            {editingPeriod?.id === p.id ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        value={editingPeriod.start_date}
                                                        onChange={e => setEditingPeriod({...editingPeriod, start_date: e.target.value})}
                                                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                                                    />
                                                    <span className="self-center text-gray-500">-</span>
                                                    <input
                                                        type="date"
                                                        value={editingPeriod.end_date}
                                                        onChange={e => setEditingPeriod({...editingPeriod, end_date: e.target.value})}
                                                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="font-mono text-gray-600 dark:text-gray-400">
                                                    {new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingPeriod?.id === p.id ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition"
                                                        >
                                                            <Save size={14} />
                                                            Guardar
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingPeriod(null)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {p.status !== 'Closed' && (
                                                            <button
                                                                onClick={() => handleEditPeriod(p)}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors text-sm font-medium"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                        )}
                                                        {p.status === 'Scheduled' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(p.id, 'Open')}
                                                                className="px-3 py-1.5 bg-green-500 dark:bg-green-600 text-white rounded-lg text-sm hover:bg-green-600 dark:hover:bg-green-700 transition"
                                                            >
                                                                Abrir
                                                            </button>
                                                        )}
                                                        {p.status === 'Open' && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(p.id, 'Closed')}
                                                                className="px-3 py-1.5 bg-red-500 dark:bg-red-600 text-white rounded-lg text-sm hover:bg-red-600 dark:hover:bg-red-700 transition"
                                                            >
                                                                Cerrar
                                                            </button>
                                                        )}
                                                        {p.status === 'Closed' && (
                                                            <span className="text-gray-400 dark:text-gray-500 text-sm">Finalizado</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={sortedPeriods.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
