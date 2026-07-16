import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { Calendar, Loader, Search, Edit, ArrowUp, ArrowDown, ArrowUpDown, Plus, X, Save } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/TableSkeleton';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import { Pagination } from '../ui/Pagination';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import type { CreatePeriodPayload, Period } from '../../types/api';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

type SortKey = 'name' | 'status' | 'year' | 'month';

interface PeriodsManagerProps {
    projectId: number;
}

export const PeriodsManager = ({ projectId }: PeriodsManagerProps) => {
    const [periods, setPeriods] = useState<Period[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'year', direction: 'desc' });
    const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
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
            const data = await apiFetch<Period[]>(`/api/periods?projectId=${projectId}`);
            setPeriods(data);
        } catch (err) {
            toast.error(`Error al cargar períodos: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchPeriods(); }, [projectId]);

    const handleUpdateStatus = async (periodId: number, newStatus: string, isAutoClose = false) => {
        try {
            await apiFetch(`/api/periods/${periodId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus, projectId })
            });

            if (!isAutoClose) {
                toast.success('Estado del período actualizado');
            } else {
                toast.info('Período cerrado automáticamente por fecha de cierre');
            }

            fetchPeriods();
        } catch (err) {
            toast.error(`Error al actualizar estado: ${getErrorMessage(err)}`);
        }
    };

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periods]);

    const handleCreatePeriod = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsCreating(true);
        const monthName = months.find(m => m.value === newPeriod.month)?.name ?? '';
        const periodToCreate: CreatePeriodPayload = {
            ...newPeriod,
            name: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${newPeriod.year}`,
            projectId,
        };

        try {
            await apiFetch('/api/periods', { method: 'POST', body: JSON.stringify(periodToCreate) });
            toast.success('Período creado exitosamente');
            setShowCreateForm(false);
            fetchPeriods();
        } catch (err) {
            toast.error(`Error al crear período: ${getErrorMessage(err)}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditPeriod = (period: Period) => {
        setEditingPeriod({
            ...period,
            start_date: period.start_date.split('T')[0],
            end_date: period.end_date.split('T')[0]
        });
    };

    const handleSaveEdit = async () => {
        if (!editingPeriod) return;
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
                    end_date: editingPeriod.end_date,
                    projectId
                })
            });

            toast.success('Período actualizado exitosamente');
            setEditingPeriod(null);
            fetchPeriods();
        } catch (err) {
            toast.error(`Error al actualizar período: ${getErrorMessage(err)}`);
        }
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'Open': 'tag-accent',
            'Closed': 'tag-neutral',
            'Scheduled': 'border border-accent text-accent-300'
        };
        const tooltips: Record<string, string> = {
            'Open': 'Período activo - Los estudiantes pueden registrar observaciones',
            'Closed': 'Período cerrado - Ya no se pueden registrar observaciones',
            'Scheduled': 'Período programado - Aún no está activo'
        };
        return (
            <Tooltip content={tooltips[status]}>
                <span className={`tag ${styles[status]}`}>{status}</span>
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
        const sorted = [...filteredPeriods];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aValue: string | number = a[sortConfig.key];
                let bValue: string | number = b[sortConfig.key];

                if (sortConfig.key === 'year' || sortConfig.key === 'month') {
                    aValue = Number(aValue);
                    bValue = Number(bValue);
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

    const SortIcon = ({ sortKey }: { sortKey: SortKey }) =>
        sortConfig.key === sortKey ? (
            sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent-300" /> : <ArrowDown size={14} className="text-accent-300" />
        ) : (
            <ArrowUpDown size={14} className="text-muted opacity-40" />
        );

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Períodos' }]} />

            {/* Periods Table */}
            <div className="card elev-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-medium text-ink">Períodos de Recolección</h3>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar períodos..."
                                className="input pl-10 w-full sm:w-64"
                            />
                        </div>
                        <Button onClick={() => setShowCreateForm(true)}>
                            <Plus size={18} />
                            <span className="hidden sm:inline">Nuevo Período</span>
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <TableSkeleton rows={5} columns={5} />
                ) : filteredPeriods.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title="No hay períodos registrados"
                        description="Crea tu primer período para comenzar a recopilar datos de variables."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
                                        <th
                                            onClick={() => handleSort('name')}
                                            className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                Nombre
                                                <SortIcon sortKey="name" />
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('status')}
                                            className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                Estado
                                                <SortIcon sortKey="status" />
                                            </div>
                                        </th>
                                        <th className="p-3 font-medium text-muted">Fechas</th>
                                        <th className="p-3 text-right font-medium text-muted">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPeriods.map(p => (
                                    <tr key={p.id} className="hover:bg-accent-800/10 border-b last:border-none transition-colors" style={{ borderColor: 'var(--color-divider)' }}>
                                        <td className="p-3 font-medium text-ink">{p.name}</td>
                                        <td className="p-3">{getStatusBadge(p.status)}</td>
                                        <td className="p-3">
                                            {editingPeriod?.id === p.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="date"
                                                        value={editingPeriod.start_date}
                                                        onChange={e => setEditingPeriod({...editingPeriod, start_date: e.target.value})}
                                                        className="input py-1 text-xs"
                                                    />
                                                    <span className="text-muted">-</span>
                                                    <input
                                                        type="date"
                                                        value={editingPeriod.end_date}
                                                        onChange={e => setEditingPeriod({...editingPeriod, end_date: e.target.value})}
                                                        className="input py-1 text-xs"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="font-mono text-muted">
                                                    {new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingPeriod?.id === p.id ? (
                                                    <>
                                                        <Button size="sm" onClick={handleSaveEdit}>
                                                            <Save size={14} />
                                                            Guardar
                                                        </Button>
                                                        <Button size="icon-sm" variant="ghost" onClick={() => setEditingPeriod(null)} className="text-muted hover:text-ink">
                                                            <X size={14} />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {p.status !== 'Closed' && (
                                                            <Button size="icon-sm" variant="ghost" onClick={() => handleEditPeriod(p)} className="text-accent-300" title="Editar fechas">
                                                                <Edit size={14} />
                                                            </Button>
                                                        )}
                                                        {p.status === 'Scheduled' && (
                                                            <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(p.id, 'Open')} className="text-success hover:bg-success/10">
                                                                Abrir
                                                            </Button>
                                                        )}
                                                        {p.status === 'Open' && (
                                                            <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(p.id, 'Closed')} className="text-danger hover:bg-danger/10">
                                                                Cerrar
                                                            </Button>
                                                        )}
                                                        {p.status === 'Closed' && (
                                                            <span className="text-muted text-sm">Finalizado</span>
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

            {/* Create Period Dialog */}
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                <DialogContent className="rounded-[var(--nc-radius-lg)] w-full max-w-lg sm:max-w-lg">
                    <DialogTitle className="text-xl font-medium text-ink">Crear Nuevo Período</DialogTitle>
                    <form onSubmit={handleCreatePeriod} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="field">
                                <label>Mes</label>
                                <select
                                    value={newPeriod.month}
                                    onChange={e => setNewPeriod({...newPeriod, month: parseInt(e.target.value)})}
                                    className="input"
                                >
                                    {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Año</label>
                                <select
                                    value={newPeriod.year}
                                    onChange={e => setNewPeriod({...newPeriod, year: parseInt(e.target.value)})}
                                    className="input"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={newPeriod.start_date}
                                    onChange={e => setNewPeriod({...newPeriod, start_date: e.target.value})}
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label>Fecha Fin</label>
                                <input
                                    type="date"
                                    value={newPeriod.end_date}
                                    onChange={e => setNewPeriod({...newPeriod, end_date: e.target.value})}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating ? (
                                    <>
                                        <Loader className="animate-spin" size={16} />
                                        Creando...
                                    </>
                                ) : (
                                    'Crear Período'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
