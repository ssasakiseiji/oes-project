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
import type { ObservationUnit, StudyField, ObservationRow, Period, StudentTasksResponse, User, Variable, VariableDataType } from '../../types/api';

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

export const ObservationsManager = () => {
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
    const isDark = document.documentElement.classList.contains('dark');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
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
            const [p, t, u] = await Promise.all([
                apiFetch<Period[]>('/api/periods'),
                apiFetch<StudentTasksResponse>('/api/student-tasks'),
                apiFetch<User[]>('/api/users'),
            ]);

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
    }, []);

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showExportMenu]);

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
    }, [filters]);

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
            await apiFetch(`/api/observations/${observationId}`, { method: 'PUT', body: JSON.stringify({ value: payloadValue }) });

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
            await apiFetch(`/api/observations/${confirmModal.observationId}`, { method: 'DELETE' });

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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
                {/* Header con título y botones de acción */}
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Auditoría de Observaciones</h3>
                    <div className="flex items-center gap-2">
                        <Tooltip content={editingObservation.id ? "Finaliza la edición para usar filtros" : "Toggle Filtros (Ctrl+/)"}>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                disabled={editingObservation.id !== null}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition relative disabled:opacity-50 disabled:cursor-not-allowed ${
                                    showFilters
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                <Filter size={16}/> Filtros
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </Tooltip>
                        {/* Dropdown menu for export */}
                        <div className="relative" ref={exportMenuRef}>
                            <Tooltip content={editingObservation.id ? "Finaliza la edición para exportar" : "Opciones de exportación"}>
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    disabled={observations.length === 0 || editingObservation.id !== null}
                                    className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <MoreVertical size={20} />
                                </button>
                            </Tooltip>
                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden z-50 animate-scale-in">
                                    <button
                                        onClick={() => {
                                            exportToCSV(toExportRows(sortedObservations), 'observaciones_registradas', EXPORT_HEADERS);
                                            toast.success('Datos exportados a CSV');
                                            setShowExportMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Download size={18} className="text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium">Exportar CSV</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            exportToExcel(toExportRows(sortedObservations), 'observaciones_registradas', EXPORT_HEADERS, 'Observaciones');
                                            toast.success('Datos exportados a Excel');
                                            setShowExportMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Download size={18} className="text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-medium">Exportar Excel</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Barra de búsqueda */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={editingObservation.id ? "Finaliza la edición para buscar" : "Buscar por variable, unidad o estudiante... (Ctrl+K)"}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={editingObservation.id !== null}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {searchTerm && !editingObservation.id && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {searchTerm && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {sortedObservations.length} resultado{sortedObservations.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                {showFilters && (
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <SlidersHorizontal size={16} />
                                Opciones de Filtrado
                            </h4>
                            {activeFilterCount > 0 && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-semibold">
                                    {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''} activo{activeFilterCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Período</label>
                                <Select<{ value: number | string; label?: string }>
                                    placeholder="Seleccionar período..."
                                    value={filterOptions.periods.find(o => o.id === selectedFilters.periodId) ? {value: selectedFilters.periodId!, label: filterOptions.periods.find(o => o.id === selectedFilters.periodId)?.name} : null}
                                    options={filterOptions.periods.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('periodId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Campo de Estudio</label>
                                <Select<{ value: number; label?: string }>
                                    placeholder="Seleccionar campo de estudio..."
                                    value={filterOptions.studyFields.find(o => o.id === selectedFilters.studyFieldId) ? {value: selectedFilters.studyFieldId!, label: filterOptions.studyFields.find(o => o.id === selectedFilters.studyFieldId)?.name} : null}
                                    options={filterOptions.studyFields.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('studyFieldId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Variable</label>
                                <Select<{ value: number; label?: string }>
                                    placeholder="Seleccionar variable..."
                                    value={filterOptions.variables.find(o => o.id === selectedFilters.variableId) ? {value: selectedFilters.variableId!, label: filterOptions.variables.find(o => o.id === selectedFilters.variableId)?.name} : null}
                                    options={filterOptions.variables.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('variableId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Estudiante</label>
                                <Select<{ value: number; label?: string }>
                                    placeholder="Seleccionar estudiante..."
                                    value={filterOptions.users.find(o => o.id === selectedFilters.userId) ? {value: selectedFilters.userId!, label: filterOptions.users.find(o => o.id === selectedFilters.userId)?.name} : null}
                                    options={filterOptions.users.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('userId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Unidad de Observación</label>
                                <Select<{ value: number; label?: string }>
                                    placeholder="Seleccionar unidad..."
                                    value={filterOptions.observationUnits?.find(o => o.id === selectedFilters.observationUnitId) ? {value: selectedFilters.observationUnitId!, label: filterOptions.observationUnits?.find(o => o.id === selectedFilters.observationUnitId)?.name} : null}
                                    options={filterOptions.observationUnits?.map(o=>({value:o.id, label:o.name})) || []}
                                    onChange={v => handleFilterChange('observationUnitId', v?.value ?? null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1 flex items-end">
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition w-full">
                                    <input
                                        type="checkbox"
                                        checked={selectedFilters.showOutliersOnly}
                                        onChange={e => handleFilterChange('showOutliersOnly', e.target.checked)}
                                        className="h-4 w-4 rounded form-checkbox text-blue-600 dark:text-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-yellow-500" />
                                        Solo atípicos
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={clearFilters}
                                disabled={activeFilterCount === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X size={16} />
                                Limpiar
                            </button>
                            <button
                                onClick={applyFilters}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition shadow-sm"
                            >
                                <Check size={16} />
                                Aplicar Filtros
                            </button>
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
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th onClick={() => handleSort('variableName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Variable
                                                {sortConfig.key === 'variableName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('studyFieldName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Campo de Estudio
                                                {sortConfig.key === 'studyFieldName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-3 text-gray-500 dark:text-gray-400">Valor</th>
                                        <th onClick={() => handleSort('observationUnitName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Unidad de Observación
                                                {sortConfig.key === 'observationUnitName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('userName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Estudiante
                                                {sortConfig.key === 'userName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('periodName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Período
                                                {sortConfig.key === 'periodName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-3 text-gray-500 dark:text-gray-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {paginatedObservations.map(o => (
                            <tr key={o.id} className={`border-b border-gray-100 dark:border-gray-700 last:border-none transition-all ${
                                editingObservation.id === o.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset'
                                    : o.isOutlier
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}>
                                <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{o.variableName}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">
                                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                        {o.studyFieldName}
                                    </span>
                                </td>
                                <td className="p-3 font-mono text-gray-800 dark:text-gray-100">
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
                                                className="w-32 p-1 border-2 border-blue-500 dark:border-blue-400 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        ) : editingObservation.dataType === 'boolean' ? (
                                            <select
                                                value={editingObservation.booleanValue ? 'true' : 'false'}
                                                onChange={e => setEditingObservation({...editingObservation, booleanValue: e.target.value === 'true'})}
                                                className="p-1 border-2 border-blue-500 dark:border-blue-400 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                className="w-40 p-1 border-2 border-blue-500 dark:border-blue-400 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        )
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>{formatObservationValue(o) || <span className="text-gray-400 italic">Sin valor</span>}</span>
                                            {o.isOutlier && <AlertTriangle size={16} className="text-yellow-500 dark:text-yellow-400"/>}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{o.observationUnitName}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{o.userName}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{o.periodName}</td>
                                <td className="p-3">
                                    <div className="flex gap-1">
                                        {editingObservation.id === o.id ? (
                                            <>
                                                <Tooltip content="Guardar (Enter)">
                                                    <button
                                                        onClick={() => handleSaveEdit(o.id)}
                                                        className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition"
                                                    >
                                                        <Check size={16} className="text-green-600 dark:text-green-400"/>
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Cancelar (Esc)">
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition"
                                                    >
                                                        <X size={16} className="text-red-600 dark:text-red-400"/>
                                                    </button>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <>
                                                <Tooltip content="Editar valor">
                                                    <button
                                                        onClick={() => startEditing(o)}
                                                        disabled={editingObservation.id !== null}
                                                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Edit size={16} className="text-blue-600 dark:text-blue-400"/>
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Eliminar registro">
                                                    <button
                                                        onClick={() => handleDelete(o.id)}
                                                        disabled={editingObservation.id !== null}
                                                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 size={16} className="text-red-600 dark:text-red-400"/>
                                                    </button>
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
