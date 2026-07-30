import { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';
import { Filter, MoreVertical, Download, Search, Check, X, Edit, Trash2, AlertTriangle, Database, SlidersHorizontal, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { exportToCSV, exportToExcel, formatObservationValue } from '../../utils/exportUtils';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import { Pagination } from '../ui/Pagination';
import { TableSkeleton } from '../ui/TableSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmModal } from '../ui/ConfirmModal';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import type { ObservationUnit, StudyField, ObservationRow, Period, ProjectMember, StudentTasksResponse, User, Variable, VariableDataType } from '../../types/api';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

interface FilterPeriodOption {
    id: number | string;
    name: string;
    special?: boolean;
}

interface SelectedFilters {
    periodId: number | string | null;
    studyFieldId: number | null;
    variableId: number | null;
    userId: number | null;
    observationUnitId: number | null;
    showOutliersOnly: boolean;
}

interface FilterOptions {
    periods: FilterPeriodOption[];
    studyFields: StudyField[];
    variables: Variable[];
    users: User[];
    observationUnits: ObservationUnit[];
}

interface EditingObservationState {
    id: number | null;
    dataType: VariableDataType | null;
    isCurrency: boolean;
    value: string;
    booleanValue: boolean;
    originalValue: string;
}

const emptyEditingState: EditingObservationState = { id: null, dataType: null, isCurrency: false, value: '', booleanValue: false, originalValue: '' };

const EXPORT_HEADERS = [
    { key: 'variableName' as const, label: 'Variable' },
    { key: 'studyFieldName' as const, label: 'Campo de Estudio' },
    { key: 'formattedValue' as const, label: 'Valor' },
    { key: 'observationUnitName' as const, label: 'Unidad de Observación' },
    { key: 'userName' as const, label: 'Estudiante' },
    { key: 'createdAt' as const, label: 'Fecha' }
];

type ExportRow = ObservationRow & { formattedValue: string };

// Solo columnas de texto/no-nulas son ordenables -- el valor en sí es
// polimórfico (numericValue/textValue/booleanValue/choiceValue, varias
// nullable) y no tiene un único campo comparable con < / >.
type SortableKey = 'variableName' | 'studyFieldName' | 'observationUnitName' | 'userName' | 'periodName';

interface ObservationsManagerProps {
    projectId: number;
}

export const ObservationsManager = ({ projectId }: ObservationsManagerProps) => {
    const [observations, setObservations] = useState<ObservationRow[]>([]);
    const [filters, setFilters] = useState<Record<string, string | number | boolean>>({});
    const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
        periodId: null,
        studyFieldId: null,
        variableId: null,
        userId: null,
        observationUnitId: null,
        showOutliersOnly: false
    });
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({ periods: [], studyFields: [], variables: [], users: [], observationUnits: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [editingObservation, setEditingObservation] = useState<EditingObservationState>(emptyEditingState);
    const [showFilters, setShowFilters] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; observationId: number | null }>({ isOpen: false, observationId: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const itemsPerPage = 10;
    const toast = useToast();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    const toExportRows = (rows: ObservationRow[]): ExportRow[] =>
        rows.map(r => ({ ...r, formattedValue: formatObservationValue(r) }));

    const sortedObservations = useMemo(() => {
        let sorted = [...observations];

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            sorted = sorted.filter(o =>
                o.variableName?.toLowerCase().includes(search) ||
                o.observationUnitName?.toLowerCase().includes(search) ||
                o.userName?.toLowerCase().includes(search) ||
                formatObservationValue(o).toLowerCase().includes(search)
            );
        }

        // Apply sorting
        const sortKey = sortConfig.key;
        if (sortKey) {
            sorted.sort((a, b) => {
                if (a[sortKey] < b[sortKey]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortKey] > b[sortKey]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [observations, sortConfig, searchTerm]);

    // Keyboard shortcuts
    useHotkeys('ctrl+k, cmd+k', (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
    }, { enableOnFormTags: true });

    useHotkeys('ctrl+e, cmd+e', (e) => {
        e.preventDefault();
        if (observations.length > 0) {
            exportToCSV(toExportRows(sortedObservations), 'observaciones_registradas', EXPORT_HEADERS);
            toast.success('Datos exportados a CSV (Ctrl+E)');
        }
    });

    useHotkeys('ctrl+slash, cmd+slash', (e) => {
        e.preventDefault();
        setShowFilters(prev => !prev);
    });

    useEffect(() => {
        const loadFilterOptions = async () => {
            const [p, t, members] = await Promise.all([
                apiFetch<Period[]>(`/api/periods?projectId=${projectId}`),
                apiFetch<StudentTasksResponse>(`/api/student-tasks?projectId=${projectId}`),
                // GET /api/users quedó superadmin-only en Fase R -- un admin de
                // proyecto (no superadmin) recibiría 403 acá. project-memberships
                // devuelve justo los miembros de ESTE proyecto, que es lo que este
                // filtro necesita de todos modos.
                apiFetch<ProjectMember[]>(`/api/project-memberships?projectId=${projectId}`),
            ]);
            const u: User[] = members.map(m => ({ id: m.userId, name: m.name, email: m.email, roles: m.roles }));

            // Agregar opciones especiales al inicio de períodos
            const specialPeriods: FilterPeriodOption[] = [
                { id: 'ALL', name: '📋 Todos los Períodos', special: true },
                { id: 'LATEST', name: '🕐 Último Período', special: true }
            ];

            const allPeriods: FilterPeriodOption[] = [...specialPeriods, ...p];

            setFilterOptions({
                periods: allPeriods,
                studyFields: t.studyFields,
                variables: t.variables,
                users: u,
                observationUnits: t.assignedObservationUnits
            });

            // Configurar "Último Período" por defecto
            if (p.length > 0) {
                const latestPeriod = p[0]; // Los períodos vienen ordenados por fecha DESC
                setSelectedFilters(prev => ({ ...prev, periodId: latestPeriod.id }));
                setFilters({ periodId: latestPeriod.id });
            }
        };
        loadFilterOptions();
    }, [projectId]);

    // Focus input when editing starts
    useEffect(() => {
        if (editingObservation.id && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingObservation.id]);

    useEffect(() => {
        const fetchObservations = async () => {
            setIsLoading(true);
            const validFilters = Object.fromEntries(
                Object.entries(filters)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => [k, String(v)])
            );
            const params = new URLSearchParams(validFilters);
            params.set('projectId', String(projectId));
            try {
                const data = await apiFetch<ObservationRow[]>(`/api/observations?${params.toString()}`);
                setObservations(data);
            } catch (err) {
                toast.error(`Error al cargar observaciones: ${getErrorMessage(err)}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchObservations();
    }, [filters, projectId]);

    const handleFilterChange = <K extends keyof SelectedFilters>(key: K, value: SelectedFilters[K]) => {
        setSelectedFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        setCurrentPage(1);
        const newFilters: Record<string, string | number | boolean> = {};
        Object.entries(selectedFilters).forEach(([key, value]) => {
            if (value !== null && value !== false && value !== '') {
                // Manejar filtros especiales de período
                if (key === 'periodId') {
                    if (value === 'ALL') {
                        // No agregar filtro de período = mostrar todos
                        return;
                    } else if (value === 'LATEST') {
                        // Obtener el último período real
                        const realPeriods = filterOptions.periods.filter(p => !p.special);
                        if (realPeriods.length > 0) {
                            newFilters[key] = realPeriods[0].id;
                        }
                        return;
                    }
                }
                newFilters[key] = value;
            }
        });
        setFilters(newFilters);
        toast.success('Filtros aplicados');
    };

    const clearFilters = () => {
        // Obtener el último período real para configurarlo por defecto
        const realPeriods = filterOptions.periods.filter(p => !p.special);
        const defaultPeriodId = realPeriods.length > 0 ? realPeriods[0].id : null;

        setSelectedFilters({
            periodId: defaultPeriodId,
            studyFieldId: null,
            variableId: null,
            userId: null,
            observationUnitId: null,
            showOutliersOnly: false
        });
        setFilters(defaultPeriodId !== null ? { periodId: defaultPeriodId } : {});
        setCurrentPage(1);
        toast.success('Filtros limpiados - Mostrando último período');
    };

    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(v => v !== null && v !== false && v !== '').length;
    }, [filters]);

    const handleSort = (key: SortableKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const paginatedObservations = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedObservations.slice(start, start + itemsPerPage);
    }, [sortedObservations, currentPage]);

    const totalPages = Math.ceil(sortedObservations.length / itemsPerPage);

    const startEditing = (row: ObservationRow) => {
        if (row.dataType === 'numeric') {
            const intValue = Math.floor(Number(row.numericValue));
            setEditingObservation({ id: row.id, dataType: 'numeric', isCurrency: row.isCurrency, value: intValue.toString(), booleanValue: false, originalValue: intValue.toString() });
        } else if (row.dataType === 'boolean') {
            setEditingObservation({ id: row.id, dataType: 'boolean', isCurrency: false, value: '', booleanValue: !!row.booleanValue, originalValue: row.booleanValue ? 'true' : 'false' });
        } else if (row.dataType === 'categorical') {
            setEditingObservation({ id: row.id, dataType: 'categorical', isCurrency: false, value: row.choiceValue ?? '', booleanValue: false, originalValue: row.choiceValue ?? '' });
        } else {
            setEditingObservation({ id: row.id, dataType: 'text', isCurrency: false, value: row.textValue ?? '', booleanValue: false, originalValue: row.textValue ?? '' });
        }
    };

    const cancelEditing = () => setEditingObservation(emptyEditingState);

    const handleSaveEdit = async (observationId: number) => {
        const { dataType, value, booleanValue, originalValue } = editingObservation;
        if (!dataType) return;

        let payloadValue: number | string | boolean;
        let comparableValue: string;

        if (dataType === 'numeric') {
            const newValue = parseInt(value);
            if (isNaN(newValue) || newValue <= 0) {
                toast.error('El valor debe ser un número mayor a 0');
                return;
            }
            payloadValue = newValue;
            comparableValue = newValue.toString();
        } else if (dataType === 'boolean') {
            payloadValue = booleanValue;
            comparableValue = booleanValue ? 'true' : 'false';
        } else {
            if (!value.trim()) {
                toast.error('El valor no puede estar vacío');
                return;
            }
            payloadValue = value.trim();
            comparableValue = value.trim();
        }

        if (comparableValue === originalValue) {
            toast.info('No se detectaron cambios');
            setEditingObservation(emptyEditingState);
            return;
        }

        try {
            await apiFetch(`/api/observations/${observationId}`, { method: 'PUT', body: JSON.stringify({ value: payloadValue, projectId }) });

            setObservations(prev =>
                prev.map(o => {
                    if (o.id !== observationId) return o;
                    if (dataType === 'numeric') return { ...o, numericValue: payloadValue as number };
                    if (dataType === 'boolean') return { ...o, booleanValue: payloadValue as boolean };
                    if (dataType === 'categorical') return { ...o, choiceValue: payloadValue as string };
                    return { ...o, textValue: payloadValue as string };
                })
            );

            toast.success('Observación actualizada exitosamente');
            setEditingObservation(emptyEditingState);
        } catch (err) {
            toast.error(`Error al actualizar observación: ${getErrorMessage(err)}`);
        }
    };

    const handleDelete = async (observationId: number) => {
        setConfirmModal({ isOpen: true, observationId });
    };

    const confirmDelete = async () => {
        try {
            await apiFetch(`/api/observations/${confirmModal.observationId}?projectId=${projectId}`, { method: 'DELETE' });

            setObservations(prev => prev.filter(o => o.id !== confirmModal.observationId));

            toast.success('Registro eliminado exitosamente');
            setConfirmModal({ isOpen: false, observationId: null });
        } catch (err) {
            toast.error(`Error al eliminar registro: ${getErrorMessage(err)}`);
        }
    };

    return (
        <>
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Registros' }]} />
            <div className="card elev-sm p-6 space-y-4">
                {/* Header con título y botones de acción */}
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <h3 className="text-lg font-medium text-ink">Auditoría de Observaciones</h3>
                    <div className="flex items-center gap-2">
                        <Tooltip content={editingObservation.id ? "Finaliza la edición para usar filtros" : "Toggle Filtros (Ctrl+/)"}>
                            <Button
                                variant={showFilters ? 'default' : 'secondary'}
                                onClick={() => setShowFilters(!showFilters)}
                                disabled={editingObservation.id !== null}
                                className="relative"
                            >
                                <Filter size={16}/> Filtros
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full text-xs font-bold bg-accent-800 text-accent-100">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </Tooltip>
                        {/* Dropdown menu for export */}
                        <DropdownMenu open={showExportMenu} onOpenChange={setShowExportMenu}>
                            <Tooltip content={editingObservation.id ? "Finaliza la edición para exportar" : "Opciones de exportación"}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        disabled={observations.length === 0 || editingObservation.id !== null}
                                    >
                                        <MoreVertical size={20} />
                                    </Button>
                                </DropdownMenuTrigger>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    onSelect={() => {
                                        exportToCSV(toExportRows(sortedObservations), 'observaciones_registradas', EXPORT_HEADERS);
                                        toast.success('Datos exportados a CSV');
                                    }}
                                >
                                    <Download size={16} className="text-success" />
                                    Exportar CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        exportToExcel(toExportRows(sortedObservations), 'observaciones_registradas', EXPORT_HEADERS, 'Observaciones');
                                        toast.success('Datos exportados a Excel');
                                    }}
                                >
                                    <Download size={16} className="text-accent-300" />
                                    Exportar Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Barra de búsqueda */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={editingObservation.id ? "Finaliza la edición para buscar" : "Buscar por variable, unidad o estudiante... (Ctrl+K)"}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={editingObservation.id !== null}
                            className="input pl-10"
                        />
                        {searchTerm && !editingObservation.id && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {searchTerm && (
                        <span className="text-sm text-muted whitespace-nowrap">
                            {sortedObservations.length} resultado{sortedObservations.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                {showFilters && (
                    <div className="pt-4 space-y-4" style={{ borderTop: '1px solid var(--color-divider)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[11px] uppercase tracking-wide text-accent-300 flex items-center gap-2">
                                <SlidersHorizontal size={14} />
                                Opciones de Filtrado
                            </h4>
                            {activeFilterCount > 0 && (
                                <span className="tag tag-accent">
                                    {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''} activo{activeFilterCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="field">
                                <label>Período</label>
                                <Select<{ value: number | string; label?: string }>
                                    placeholder="Seleccionar período..."
                                    value={filterOptions.periods.find(o => o.id === selectedFilters.periodId) ? {value: selectedFilters.periodId!, label: filterOptions.periods.find(o => o.id === selectedFilters.periodId)?.name} : null}
                                    options={filterOptions.periods.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('periodId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles()}
                                />
                            </div>
                            <div className="field">
                                <label>Campo de Estudio</label>
                                <Select<{ value: number; label?: string }>
                                    placeholder="Seleccionar campo de estudio..."
                                    value={filterOptions.studyFields.find(o => o.id === selectedFilters.studyFieldId) ? {value: selectedFilters.studyFieldId!, label: filterOptions.studyFields.find(o => o.id === selectedFilters.studyFieldId)?.name} : null}
                                    options={filterOptions.studyFields.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('studyFieldId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles()}
                                />
                            </div>
                            <div className="field">
                                <label>Variable</label>
                                <Select<{ value: number; label?: string }>
                                    placeholder="Seleccionar variable..."
                                    value={filterOptions.variables.find(o => o.id === selectedFilters.variableId) ? {value: selectedFilters.variableId!, label: filterOptions.variables.find(o => o.id === selectedFilters.variableId)?.name} : null}
                                    options={filterOptions.variables.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('variableId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles()}
                                />
                            </div>
                            <div className="field">
                                <label>Estudiante</label>
                                <Select<{ value: number; label?: string }>
                                    placeholder="Seleccionar estudiante..."
                                    value={filterOptions.users.find(o => o.id === selectedFilters.userId) ? {value: selectedFilters.userId!, label: filterOptions.users.find(o => o.id === selectedFilters.userId)?.name} : null}
                                    options={filterOptions.users.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('userId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles()}
                                />
                            </div>
                            <div className="field">
                                <label>Unidad de Observación</label>
                                <Select<{ value: number; label?: string }>
                                    placeholder="Seleccionar unidad..."
                                    value={filterOptions.observationUnits?.find(o => o.id === selectedFilters.observationUnitId) ? {value: selectedFilters.observationUnitId!, label: filterOptions.observationUnits?.find(o => o.id === selectedFilters.observationUnitId)?.name} : null}
                                    options={filterOptions.observationUnits?.map(o=>({value:o.id, label:o.name})) || []}
                                    onChange={v => handleFilterChange('observationUnitId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles()}
                                />
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-[var(--nc-radius-md)] border hover:border-accent transition-colors w-full" style={{ borderColor: 'var(--color-divider)' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedFilters.showOutliersOnly}
                                        onChange={e => handleFilterChange('showOutliersOnly', e.target.checked)}
                                        className="h-4 w-4 rounded accent-accent"
                                    />
                                    <span className="text-sm font-medium text-ink flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-danger" />
                                        Solo atípicos
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--color-divider)' }}>
                            <Button variant="secondary" onClick={clearFilters} disabled={activeFilterCount === 0}>
                                <X size={16} />
                                Limpiar
                            </Button>
                            <Button onClick={applyFilters}>
                                <Check size={16} />
                                Aplicar Filtros
                            </Button>
                        </div>
                    </div>
                )}
                {isLoading ? (
                    <TableSkeleton rows={5} columns={6} />
                ) : observations.length === 0 ? (
                    <EmptyState
                        icon={Database}
                        title="No hay observaciones registradas"
                        description="Los estudiantes aún no han registrado observaciones, o los filtros aplicados no coinciden con ningún registro."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
                                        <th onClick={() => handleSort('variableName')} className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">
                                                Variable
                                                {sortConfig.key === 'variableName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent-300" /> : <ArrowDown size={14} className="text-accent-300" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('studyFieldName')} className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">
                                                Campo de Estudio
                                                {sortConfig.key === 'studyFieldName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent-300" /> : <ArrowDown size={14} className="text-accent-300" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-3 font-medium text-muted">Valor</th>
                                        <th onClick={() => handleSort('observationUnitName')} className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">
                                                Unidad de Observación
                                                {sortConfig.key === 'observationUnitName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent-300" /> : <ArrowDown size={14} className="text-accent-300" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('userName')} className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">
                                                Estudiante
                                                {sortConfig.key === 'userName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent-300" /> : <ArrowDown size={14} className="text-accent-300" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('periodName')} className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">
                                                Período
                                                {sortConfig.key === 'periodName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent-300" /> : <ArrowDown size={14} className="text-accent-300" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-3 font-medium text-muted">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {paginatedObservations.map(o => (
                            <tr key={o.id} className={`border-b last:border-none transition-colors ${
                                editingObservation.id === o.id
                                    ? 'bg-accent-800/20 ring-1 ring-accent ring-inset'
                                    : o.isOutlier
                                        ? 'bg-danger/10 hover:bg-danger/15'
                                        : 'hover:bg-accent-800/10'
                            }`} style={{ borderColor: 'var(--color-divider)' }}>
                                <td className="p-3 font-medium text-ink">{o.variableName}</td>
                                <td className="p-3">
                                    <span className="tag tag-accent">
                                        {o.studyFieldName}
                                    </span>
                                </td>
                                <td className="p-3 font-mono text-ink">
                                    {editingObservation.id === o.id ? (
                                        editingObservation.dataType === 'numeric' ? (
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={editingObservation.value ? new Intl.NumberFormat('es-PY').format(parseInt(editingObservation.value) || 0) : ''}
                                                onChange={e => {
                                                    const value = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                                    setEditingObservation({...editingObservation, value});
                                                }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEdit(o.id);
                                                    if (e.key === 'Escape') cancelEditing();
                                                }}
                                                className="input w-32 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        ) : editingObservation.dataType === 'boolean' ? (
                                            <select
                                                value={editingObservation.booleanValue ? 'true' : 'false'}
                                                onChange={e => setEditingObservation({...editingObservation, booleanValue: e.target.value === 'true'})}
                                                className="input py-1"
                                            >
                                                <option value="true">Sí</option>
                                                <option value="false">No</option>
                                            </select>
                                        ) : (
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={editingObservation.value}
                                                onChange={e => setEditingObservation({...editingObservation, value: e.target.value})}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEdit(o.id);
                                                    if (e.key === 'Escape') cancelEditing();
                                                }}
                                                className="input w-40 py-1"
                                            />
                                        )
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>{formatObservationValue(o) || <span className="text-muted italic">Sin valor</span>}</span>
                                            {o.isOutlier && <AlertTriangle size={16} className="text-danger"/>}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 text-muted">{o.observationUnitName}</td>
                                <td className="p-3 text-muted">{o.userName}</td>
                                <td className="p-3 text-muted">{o.periodName}</td>
                                <td className="p-3">
                                    <div className="flex gap-1">
                                        {editingObservation.id === o.id ? (
                                            <>
                                                <Tooltip content="Guardar (Enter)">
                                                    <Button variant="ghost" size="icon-sm" onClick={() => handleSaveEdit(o.id)} className="text-success hover:bg-success/10">
                                                        <Check size={16} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content="Cancelar (Esc)">
                                                    <Button variant="ghost" size="icon-sm" onClick={cancelEditing} className="text-muted hover:text-ink">
                                                        <X size={16} />
                                                    </Button>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <>
                                                <Tooltip content="Editar valor">
                                                    <Button variant="ghost" size="icon-sm" onClick={() => startEditing(o)} disabled={editingObservation.id !== null} className="text-accent-300">
                                                        <Edit size={16} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content="Eliminar registro">
                                                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(o.id)} disabled={editingObservation.id !== null} className="text-danger hover:bg-danger/10">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </Tooltip>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={sortedObservations.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, observationId: null })}
                onConfirm={confirmDelete}
                title="Confirmar eliminación"
                message="¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer."
            />
        </>
    );
};
