import { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { Variable as VariableIcon, Tag, Search, Plus, Check, X, Edit, Trash2, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, Settings, AreaChart } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Pagination } from '../ui/Pagination';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { DistributionChartModal } from '../ui/DistributionChartModal';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { Button } from '../ui/button';
import type {
    CreateVariablePayload,
    StudentTasksResponse,
    StudyField,
    Variable,
    VariableConfig,
    VariableDataType,
} from '../../types/api';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

type ManagedItem = StudyField | Variable;
type SortKey = 'id' | 'name' | 'unit' | 'unitOfMeasure' | 'studyFieldName' | 'dataType';
type Tab = 'study-fields' | 'variables';

const DATA_TYPE_LABELS: Record<VariableDataType, string> = {
    numeric: 'Numérico',
    categorical: 'Categórico',
    boolean: 'Booleano',
    text: 'Texto',
};

interface EditingItemState {
    id: number | null;
    name: string;
    unit: string;
    originalName: string | null;
    originalUnit: string | null;
}

interface StudyFieldOption {
    value: number;
    label: string;
}

function isVariable(item: ManagedItem): item is Variable {
    return 'dataType' in item;
}

function configSummary(variable: Variable): string {
    switch (variable.dataType) {
        case 'numeric': {
            const cfg = variable.config as { isCurrency?: boolean } | null;
            return cfg?.isCurrency ? 'Numérico (monetario)' : 'Numérico';
        }
        case 'categorical': {
            const cfg = variable.config as { options: string[] } | null;
            return `Categórico (${cfg?.options?.length ?? 0} opciones)`;
        }
        case 'boolean':
            return 'Booleano (Sí/No)';
        case 'text':
            return 'Texto libre';
        default:
            return DATA_TYPE_LABELS[variable.dataType];
    }
}

interface VariablesManagerProps {
    projectId: number;
}

export const VariablesManager = ({ projectId }: VariablesManagerProps) => {
    const [activeTab, setActiveTab] = useState<Tab>('study-fields');
    const [studyFields, setStudyFields] = useState<StudyField[]>([]);
    const [variables, setVariables] = useState<Variable[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<EditingItemState>({ id: null, name: '', unit: '', originalName: null, originalUnit: null });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('');
    const [newItemDataType, setNewItemDataType] = useState<VariableDataType>('numeric');
    const [newItemIsCurrency, setNewItemIsCurrency] = useState(false);
    const [newItemOptions, setNewItemOptions] = useState<string[]>([]);
    const [newItemOptionDraft, setNewItemOptionDraft] = useState('');
    const [newItemMaxLength, setNewItemMaxLength] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ManagedItem | null>(null);
    const [selectedStudyField, setSelectedStudyField] = useState<StudyFieldOption | null>(null);
    const [configTarget, setConfigTarget] = useState<Variable | null>(null);
    const [configOptions, setConfigOptions] = useState<string[]>([]);
    const [configOptionDraft, setConfigOptionDraft] = useState('');
    const [configIsCurrency, setConfigIsCurrency] = useState(false);
    const [configMaxLength, setConfigMaxLength] = useState('');
    const [distributionTarget, setDistributionTarget] = useState<Variable | null>(null);

    // Search, sort, pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const editInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch<StudentTasksResponse>(`/api/student-tasks?projectId=${projectId}`);
            setStudyFields(data.studyFields || []);
            setVariables(data.variables || []);
        } catch (err) {
            toast.error(`Error al cargar datos: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, projectId]);

    // Auto-focus on edit
    useEffect(() => {
        if (editingItem.id && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingItem.id]);

    // Reset pagination when switching tabs or searching
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    // ========== STUDY FIELDS CRUD ==========
    const handleAddStudyField = async () => {
        if (!newItemName.trim()) {
            toast.error('El nombre del campo de estudio no puede estar vacío');
            return;
        }

        try {
            const response = await apiFetch<StudyField>('/api/study-fields', {
                method: 'POST',
                body: JSON.stringify({
                    name: newItemName.trim(),
                    unitOfMeasure: newItemUnit.trim() || null,
                    projectId,
                })
            });

            setStudyFields(prev => [...prev, response]);
            toast.success('Campo de estudio creado exitosamente');
            setShowAddModal(false);
            setNewItemName('');
            setNewItemUnit('');
        } catch (err) {
            toast.error(`Error al crear campo de estudio: ${getErrorMessage(err)}`);
        }
    };

    // Fase Z: el campo `unit` del estado de edición se reutiliza para
    // unitOfMeasure en esta pestaña (en la de variables representa
    // Variable.unit, el descriptor de presentación -- son conceptos distintos
    // que nunca se editan en la misma fila).
    const startEditingStudyField = (studyField: StudyField) => {
        setEditingItem({
            id: studyField.id,
            name: studyField.name,
            unit: studyField.unitOfMeasure ?? '',
            originalName: studyField.name,
            originalUnit: studyField.unitOfMeasure ?? '',
        });
    };

    const handleSaveStudyFieldEdit = async () => {
        const trimmedName = editingItem.name.trim();
        const trimmedUnit = editingItem.unit.trim();

        if (trimmedName === editingItem.originalName && trimmedUnit === editingItem.originalUnit) {
            toast.info('No se detectaron cambios');
            setEditingItem({ id: null, name: '', unit: '', originalName: null, originalUnit: null });
            return;
        }

        if (!trimmedName) {
            toast.error('El nombre del campo de estudio no puede estar vacío');
            return;
        }

        const unitOfMeasure = trimmedUnit || null;

        try {
            await apiFetch(`/api/study-fields/${editingItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: trimmedName, unitOfMeasure, projectId })
            });

            setStudyFields(prev =>
                prev.map(f => f.id === editingItem.id ? { ...f, name: trimmedName, unitOfMeasure } : f)
            );

            toast.success('Campo de estudio actualizado exitosamente');
            setEditingItem({ id: null, name: '', unit: '', originalName: null, originalUnit: null });
        } catch (err) {
            toast.error(`Error al actualizar campo de estudio: ${getErrorMessage(err)}`);
        }
    };

    const confirmDeleteStudyField = (studyField: StudyField) => {
        setItemToDelete(studyField);
        setShowDeleteModal(true);
    };

    const handleDeleteStudyField = async () => {
        if (!itemToDelete) return;

        try {
            await apiFetch(`/api/study-fields/${itemToDelete.id}?projectId=${projectId}`, { method: 'DELETE' });

            setStudyFields(prev => prev.filter(f => f.id !== itemToDelete.id));
            toast.success('Campo de estudio eliminado exitosamente');
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (err) {
            toast.error(`Error al eliminar campo de estudio: ${getErrorMessage(err)}`);
        }
    };

    const cancelEditing = () => {
        setEditingItem({ id: null, name: '', unit: '', originalName: null, originalUnit: null });
    };

    // ========== VARIABLES CRUD ==========
    const resetAddForm = () => {
        setNewItemName('');
        setNewItemUnit('');
        setNewItemDataType('numeric');
        setNewItemIsCurrency(false);
        setNewItemOptions([]);
        setNewItemOptionDraft('');
        setNewItemMaxLength('');
        setSelectedStudyField(null);
    };

    const handleAddVariable = async () => {
        if (!newItemName.trim()) {
            toast.error('El nombre de la variable no puede estar vacío');
            return;
        }

        if (!selectedStudyField) {
            toast.error('Debes seleccionar un campo de estudio');
            return;
        }

        if (newItemDataType === 'categorical' && newItemOptions.length < 2) {
            toast.error('Una variable categórica necesita al menos 2 opciones');
            return;
        }

        const basePayload = {
            name: newItemName.trim(),
            unit: newItemUnit.trim() || undefined,
            studyFieldId: selectedStudyField.value,
            projectId,
        };

        let payload: CreateVariablePayload;
        switch (newItemDataType) {
            case 'numeric':
                payload = { ...basePayload, dataType: 'numeric', config: { isCurrency: newItemIsCurrency } };
                break;
            case 'categorical':
                payload = { ...basePayload, dataType: 'categorical', config: { options: newItemOptions } };
                break;
            case 'boolean':
                payload = { ...basePayload, dataType: 'boolean' };
                break;
            case 'text':
                payload = {
                    ...basePayload,
                    dataType: 'text',
                    config: newItemMaxLength ? { maxLength: Number(newItemMaxLength) } : undefined,
                };
                break;
        }

        try {
            const response = await apiFetch<Variable>('/api/variables', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setVariables(prev => [...prev, response]);
            toast.success('Variable creada exitosamente');
            setShowAddModal(false);
            resetAddForm();
        } catch (err) {
            toast.error(`Error al crear variable: ${getErrorMessage(err)}`);
        }
    };

    const startEditingVariable = (variable: Variable) => {
        setEditingItem({
            id: variable.id,
            name: variable.name,
            unit: variable.unit || '',
            originalName: variable.name,
            originalUnit: variable.unit || ''
        });
    };

    const handleSaveVariableEdit = async () => {
        const trimmedName = editingItem.name.trim();
        const trimmedUnit = editingItem.unit.trim();

        if (trimmedName === editingItem.originalName && trimmedUnit === editingItem.originalUnit) {
            toast.info('No se detectaron cambios');
            setEditingItem({ id: null, name: '', unit: '', originalName: null, originalUnit: null });
            return;
        }

        if (!trimmedName) {
            toast.error('El nombre de la variable no puede estar vacío');
            return;
        }

        try {
            await apiFetch(`/api/variables/${editingItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: trimmedName, unit: trimmedUnit || undefined, projectId })
            });

            setVariables(prev =>
                prev.map(v => v.id === editingItem.id ? { ...v, name: trimmedName, unit: trimmedUnit || null } : v)
            );

            toast.success('Variable actualizada exitosamente');
            setEditingItem({ id: null, name: '', unit: '', originalName: null, originalUnit: null });
        } catch (err) {
            toast.error(`Error al actualizar variable: ${getErrorMessage(err)}`);
        }
    };

    const confirmDeleteVariable = (variable: Variable) => {
        setItemToDelete(variable);
        setShowDeleteModal(true);
    };

    const handleDeleteVariable = async () => {
        if (!itemToDelete) return;

        try {
            await apiFetch(`/api/variables/${itemToDelete.id}?projectId=${projectId}`, { method: 'DELETE' });

            setVariables(prev => prev.filter(v => v.id !== itemToDelete.id));
            toast.success('Variable eliminada exitosamente');
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (err) {
            toast.error(`Error al eliminar variable: ${getErrorMessage(err)}`);
        }
    };

    // ========== CONFIG EDITING (variables categóricas/numéricas/texto) ==========
    const openConfigEditor = (variable: Variable) => {
        setConfigTarget(variable);
        if (variable.dataType === 'categorical') {
            const cfg = variable.config as { options: string[] } | null;
            setConfigOptions(cfg?.options ?? []);
        } else if (variable.dataType === 'numeric') {
            const cfg = variable.config as { isCurrency?: boolean } | null;
            setConfigIsCurrency(!!cfg?.isCurrency);
        } else if (variable.dataType === 'text') {
            const cfg = variable.config as { maxLength?: number } | null;
            setConfigMaxLength(cfg?.maxLength ? String(cfg.maxLength) : '');
        }
    };

    const closeConfigEditor = () => {
        setConfigTarget(null);
        setConfigOptions([]);
        setConfigOptionDraft('');
        setConfigMaxLength('');
    };

    const handleSaveConfig = async () => {
        if (!configTarget) return;

        let config: VariableConfig | undefined = undefined;
        if (configTarget.dataType === 'categorical') {
            if (configOptions.length < 2) {
                toast.error('Una variable categórica necesita al menos 2 opciones');
                return;
            }
            config = { options: configOptions };
        } else if (configTarget.dataType === 'numeric') {
            config = { isCurrency: configIsCurrency };
        } else if (configTarget.dataType === 'text') {
            config = configMaxLength ? { maxLength: Number(configMaxLength) } : undefined;
        }

        try {
            await apiFetch(`/api/variables/${configTarget.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: configTarget.name, unit: configTarget.unit || undefined, config, projectId })
            });
            setVariables(prev => prev.map(v => v.id === configTarget.id ? { ...v, config: config ?? null } : v));
            toast.success('Configuración actualizada exitosamente');
            closeConfigEditor();
        } catch (err) {
            toast.error(`Error al actualizar configuración: ${getErrorMessage(err)}`);
        }
    };

    const studyFieldOptions: StudyFieldOption[] = studyFields.map(f => ({ value: f.id, label: f.name }));

    // ========== SORTING ==========
    const handleSort = (key: SortKey) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Lee un valor "comparable" de un ítem (StudyField o Variable) para un sortKey dado.
    // Duck-typing intencional: el sortKey puede no existir en el tipo concreto del
    // ítem (p.ej. 'unit' en un StudyField), igual que en la versión pre-rename.
    const getComparableValue = (item: ManagedItem, key: SortKey): string | number => {
        if (key === 'studyFieldName') {
            const studyFieldId = (item as Variable).studyFieldId;
            return studyFields.find(f => f.id === studyFieldId)?.name || '';
        }
        const value = (item as unknown as Record<string, string | number | undefined>)[key];
        return value ?? '';
    };

    // ========== FILTERING & SORTING ==========
    const getFilteredAndSortedData = (): ManagedItem[] => {
        const data: ManagedItem[] = activeTab === 'study-fields' ? studyFields : variables;

        // Filter by search term
        const filtered = data.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            if (activeTab === 'study-fields') {
                const unitOfMeasure = (item as StudyField).unitOfMeasure || '';
                return item.name.toLowerCase().includes(searchLower) ||
                       unitOfMeasure.toLowerCase().includes(searchLower);
            } else {
                const variable = item as Variable;
                const studyFieldName = studyFields.find(f => f.id === variable.studyFieldId)?.name || '';
                const unit = variable.unit || '';
                return variable.name.toLowerCase().includes(searchLower) ||
                       unit.toLowerCase().includes(searchLower) ||
                       studyFieldName.toLowerCase().includes(searchLower);
            }
        });

        // Sort data
        filtered.sort((a, b) => {
            let aValue = getComparableValue(a, sortConfig.key);
            let bValue = getComparableValue(b, sortConfig.key);

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
    const paginatedStudyFields = paginatedData as StudyField[];
    const paginatedVariables = paginatedData as Variable[];

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const addOptionDraft = () => {
        const trimmed = newItemOptionDraft.trim();
        if (trimmed && !newItemOptions.includes(trimmed)) {
            setNewItemOptions(prev => [...prev, trimmed]);
        }
        setNewItemOptionDraft('');
    };

    const addConfigOptionDraft = () => {
        const trimmed = configOptionDraft.trim();
        if (trimmed && !configOptions.includes(trimmed)) {
            setConfigOptions(prev => [...prev, trimmed]);
        }
        setConfigOptionDraft('');
    };

    const SortIcon = ({ sortKey }: { sortKey: SortKey }) =>
        sortConfig.key === sortKey ? (
            sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-accent-300" /> : <ArrowDown size={14} className="text-accent-300" />
        ) : (
            <ArrowUpDown size={14} className="text-muted opacity-40" />
        );

    return (
        <>
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Variables y Campos de Estudio' }]} />
            <div className="card elev-sm p-6 space-y-4">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
                    <TabsList>
                        <TabsTrigger value="variables" disabled={editingItem.id !== null}>
                            <VariableIcon size={16} />
                            Variables
                        </TabsTrigger>
                        <TabsTrigger value="study-fields" disabled={editingItem.id !== null}>
                            <Tag size={16} />
                            Campos de Estudio
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Header with Search and Add Button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-medium text-ink">
                        {activeTab === 'study-fields' ? 'Campos de Estudio' : 'Variables'}
                    </h3>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                disabled={editingItem.id !== null}
                                placeholder={editingItem.id ? "Finaliza la edición para buscar" : "Buscar..."}
                                className="input pl-10 w-full sm:w-64"
                            />
                        </div>
                        <Button onClick={() => setShowAddModal(true)} disabled={editingItem.id !== null}>
                            <Plus size={18} />
                            <span className="hidden sm:inline">Agregar</span>
                        </Button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <LoadingSpinner />
                ) : activeTab === 'study-fields' ? (
                    // Study Fields Table
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left" style={{ borderColor: 'var(--color-divider)' }}>
                                        <th onClick={() => handleSort('id')} className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">
                                                ID
                                                <SortIcon sortKey="id" />
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('name')} className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">
                                                Nombre
                                                <SortIcon sortKey="name" />
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('unitOfMeasure')} className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">
                                                Unidad de Medida
                                                <SortIcon sortKey="unitOfMeasure" />
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 font-medium text-muted text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedStudyFields.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-muted">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay campos de estudio registrados'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedStudyFields.map(studyField => (
                                        <tr key={studyField.id} className={`border-b last:border-none transition-colors ${editingItem.id === studyField.id ? 'bg-accent-800/20 ring-1 ring-accent ring-inset' : 'hover:bg-accent-800/10'}`} style={{ borderColor: 'var(--color-divider)' }}>
                                            <td className="py-3 px-4 text-muted">{studyField.id}</td>
                                            <td className="py-3 px-4 text-ink">
                                                {editingItem.id === studyField.id ? (
                                                    <input
                                                        ref={editInputRef}
                                                        type="text"
                                                        value={editingItem.name}
                                                        onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveStudyFieldEdit();
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        className="input"
                                                    />
                                                ) : studyField.name}
                                            </td>
                                            <td className="py-3 px-4 text-ink">
                                                {editingItem.id === studyField.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingItem.unit}
                                                        onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveStudyFieldEdit();
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        placeholder="Ej: ₲, °C, %"
                                                        className="input w-32"
                                                    />
                                                ) : studyField.unitOfMeasure ? (
                                                    <span className="font-mono">{studyField.unitOfMeasure}</span>
                                                ) : (
                                                    <span className="text-muted text-xs italic">Sin unidad</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {editingItem.id === studyField.id ? (
                                                        <>
                                                            <Button variant="ghost" size="icon-sm" onClick={handleSaveStudyFieldEdit} className="text-success hover:bg-success/10" title="Guardar"><Check size={18} /></Button>
                                                            <Button variant="ghost" size="icon-sm" onClick={cancelEditing} className="text-muted hover:text-ink" title="Cancelar"><X size={18} /></Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button variant="ghost" size="icon-sm" onClick={() => startEditingStudyField(studyField)} disabled={editingItem.id !== null} className="text-accent-300" title="Editar"><Edit size={18} /></Button>
                                                            <Button variant="ghost" size="icon-sm" onClick={() => confirmDeleteStudyField(studyField)} disabled={editingItem.id !== null} className="text-danger hover:bg-danger/10" title="Eliminar"><Trash2 size={18} /></Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} totalItems={filteredData.length} itemsPerPage={itemsPerPage} />
                        )}
                    </>
                ) : (
                    // Variables Table
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left" style={{ borderColor: 'var(--color-divider)' }}>
                                        <th onClick={() => handleSort('id')} className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">ID <SortIcon sortKey="id" /></div>
                                        </th>
                                        <th onClick={() => handleSort('name')} className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">Nombre <SortIcon sortKey="name" /></div>
                                        </th>
                                        <th onClick={() => handleSort('dataType')} className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">Tipo <SortIcon sortKey="dataType" /></div>
                                        </th>
                                        <th onClick={() => handleSort('unit')} className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">Presentación <SortIcon sortKey="unit" /></div>
                                        </th>
                                        <th onClick={() => handleSort('studyFieldName')} className="py-3 px-4 font-medium text-muted cursor-pointer hover:text-ink transition-colors">
                                            <div className="flex items-center gap-2">Campo de Estudio <SortIcon sortKey="studyFieldName" /></div>
                                        </th>
                                        <th className="py-3 px-4 font-medium text-muted text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedVariables.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-muted">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay variables registradas'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedVariables.map(variable => (
                                        <tr key={variable.id} className={`border-b last:border-none transition-colors ${editingItem.id === variable.id ? 'bg-accent-800/20 ring-1 ring-accent ring-inset' : 'hover:bg-accent-800/10'}`} style={{ borderColor: 'var(--color-divider)' }}>
                                            <td className="py-3 px-4 text-muted">{variable.id}</td>
                                            <td className="py-3 px-4 text-ink">
                                                {editingItem.id === variable.id ? (
                                                    <input
                                                        ref={editInputRef}
                                                        type="text"
                                                        value={editingItem.name}
                                                        onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveVariableEdit();
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        className="input"
                                                    />
                                                ) : variable.name}
                                            </td>
                                            <td className="py-3 px-4 text-muted">
                                                <span className="tag tag-neutral" title={configSummary(variable)}>
                                                    {DATA_TYPE_LABELS[variable.dataType]}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-muted">
                                                {editingItem.id === variable.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingItem.unit}
                                                        onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveVariableEdit();
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        placeholder="ej: 1 kg"
                                                        className="input"
                                                    />
                                                ) : (variable.unit || 'N/A')}
                                            </td>
                                            <td className="py-3 px-4 text-muted">
                                                {studyFields.find(f => f.id === variable.studyFieldId)?.name || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {editingItem.id === variable.id ? (
                                                        <>
                                                            <Button variant="ghost" size="icon-sm" onClick={handleSaveVariableEdit} className="text-success hover:bg-success/10" title="Guardar"><Check size={18} /></Button>
                                                            <Button variant="ghost" size="icon-sm" onClick={cancelEditing} className="text-muted hover:text-ink" title="Cancelar"><X size={18} /></Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {(variable.dataType === 'categorical' || variable.dataType === 'boolean') && (
                                                                <Button variant="ghost" size="icon-sm" onClick={() => setDistributionTarget(variable)} disabled={editingItem.id !== null} className="text-muted hover:text-ink" title="Ver distribución"><AreaChart size={18} /></Button>
                                                            )}
                                                            {variable.dataType !== 'boolean' && (
                                                                <Button variant="ghost" size="icon-sm" onClick={() => openConfigEditor(variable)} disabled={editingItem.id !== null} className="text-muted hover:text-ink" title="Editar configuración"><Settings size={18} /></Button>
                                                            )}
                                                            <Button variant="ghost" size="icon-sm" onClick={() => startEditingVariable(variable)} disabled={editingItem.id !== null} className="text-accent-300" title="Editar"><Edit size={18} /></Button>
                                                            <Button variant="ghost" size="icon-sm" onClick={() => confirmDeleteVariable(variable)} disabled={editingItem.id !== null} className="text-danger hover:bg-danger/10" title="Eliminar"><Trash2 size={18} /></Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} totalItems={filteredData.length} itemsPerPage={itemsPerPage} />
                        )}
                    </>
                )}
            </div>

            {/* Add Modal */}
            <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) resetAddForm(); }}>
                <DialogContent className="rounded-[var(--nc-radius-lg)] w-full max-w-md sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogTitle className="text-xl font-medium text-ink">
                        Agregar {activeTab === 'study-fields' ? 'Campo de Estudio' : 'Variable'}
                    </DialogTitle>

                    <div className="space-y-3">
                        <div className="field">
                            <label>Nombre</label>
                            <input
                                type="text"
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && activeTab === 'study-fields') handleAddStudyField();
                                }}
                                className="input"
                                placeholder={`Nombre de ${activeTab === 'study-fields' ? 'el campo de estudio' : 'la variable'}`}
                                autoFocus
                            />
                        </div>

                        {activeTab === 'study-fields' && (
                            <div className="field">
                                <label>Unidad de Medida (opcional)</label>
                                <input
                                    type="text"
                                    value={newItemUnit}
                                    onChange={e => setNewItemUnit(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddStudyField(); }}
                                    className="input"
                                    placeholder="ej: ₲, °C, %"
                                />
                                <p className="text-xs text-muted mt-1">
                                    Unidad en la que se miden las variables numéricas de este campo. Solo se
                                    agregan entre sí métricas que comparten unidad. Déjala vacía si el campo
                                    es puramente cualitativo.
                                </p>
                            </div>
                        )}

                        {activeTab === 'variables' && (
                            <>
                                <div className="field">
                                    <label>Tipo de Dato</label>
                                    <select
                                        value={newItemDataType}
                                        onChange={e => setNewItemDataType(e.target.value as VariableDataType)}
                                        className="input"
                                    >
                                        {(Object.keys(DATA_TYPE_LABELS) as VariableDataType[]).map(dt => (
                                            <option key={dt} value={dt}>{DATA_TYPE_LABELS[dt]}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field">
                                    <label>Presentación (opcional)</label>
                                    <input
                                        type="text"
                                        value={newItemUnit}
                                        onChange={e => setNewItemUnit(e.target.value)}
                                        className="input"
                                        placeholder="ej: 1 kg, 500 g, 2 L"
                                    />
                                    <p className="text-xs text-muted mt-1">
                                        Cantidad de referencia a la que se le observa el valor. La unidad en la
                                        que se mide ese valor la define el campo de estudio.
                                    </p>
                                </div>

                                {newItemDataType === 'numeric' && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newItemIsCurrency}
                                            onChange={e => setNewItemIsCurrency(e.target.checked)}
                                            className="h-4 w-4 rounded accent-accent"
                                        />
                                        <span className="text-sm text-ink">Es un valor monetario (₲)</span>
                                    </label>
                                )}

                                {newItemDataType === 'categorical' && (
                                    <div className="field">
                                        <label>Opciones (mínimo 2)</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newItemOptionDraft}
                                                onChange={e => setNewItemOptionDraft(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOptionDraft(); } }}
                                                className="input flex-1"
                                                placeholder="Agregar opción..."
                                            />
                                            <Button type="button" variant="secondary" size="icon" onClick={addOptionDraft}>
                                                <Plus size={16} />
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {newItemOptions.map(opt => (
                                                <span key={opt} className="tag tag-accent inline-flex items-center gap-1">
                                                    {opt}
                                                    <button type="button" onClick={() => setNewItemOptions(prev => prev.filter(o => o !== opt))}><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {newItemDataType === 'text' && (
                                    <div className="field">
                                        <label>Largo máximo (opcional)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={newItemMaxLength}
                                            onChange={e => setNewItemMaxLength(e.target.value)}
                                            className="input"
                                            placeholder="ej: 500"
                                        />
                                    </div>
                                )}

                                <div className="field">
                                    <label>Campo de Estudio</label>
                                    <Select<StudyFieldOption>
                                        value={selectedStudyField}
                                        onChange={(option) => setSelectedStudyField(option)}
                                        options={studyFieldOptions}
                                        placeholder="Seleccionar campo de estudio"
                                        styles={getReactSelectStyles<StudyFieldOption>()}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={() => { setShowAddModal(false); resetAddForm(); }}>
                            Cancelar
                        </Button>
                        <Button onClick={activeTab === 'study-fields' ? handleAddStudyField : handleAddVariable}>
                            Agregar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Config Edit Modal */}
            <Dialog open={configTarget !== null} onOpenChange={(open) => { if (!open) closeConfigEditor(); }}>
                <DialogContent className="rounded-[var(--nc-radius-lg)] w-full max-w-md sm:max-w-md">
                    <DialogTitle className="text-xl font-medium text-ink">
                        Configuración de "{configTarget?.name}"
                    </DialogTitle>

                    {configTarget?.dataType === 'numeric' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={configIsCurrency} onChange={e => setConfigIsCurrency(e.target.checked)} className="h-4 w-4 rounded accent-accent" />
                            <span className="text-sm text-ink">Es un valor monetario (₲)</span>
                        </label>
                    )}

                    {configTarget?.dataType === 'categorical' && (
                        <div className="field">
                            <label>Opciones (mínimo 2)</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={configOptionDraft}
                                    onChange={e => setConfigOptionDraft(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addConfigOptionDraft(); } }}
                                    className="input flex-1"
                                    placeholder="Agregar opción..."
                                />
                                <Button type="button" variant="secondary" size="icon" onClick={addConfigOptionDraft}>
                                    <Plus size={16} />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {configOptions.map(opt => (
                                    <span key={opt} className="tag tag-accent inline-flex items-center gap-1">
                                        {opt}
                                        <button type="button" onClick={() => setConfigOptions(prev => prev.filter(o => o !== opt))}><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {configTarget?.dataType === 'text' && (
                        <div className="field">
                            <label>Largo máximo (opcional)</label>
                            <input
                                type="number"
                                min={1}
                                value={configMaxLength}
                                onChange={e => setConfigMaxLength(e.target.value)}
                                className="input"
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={closeConfigEditor}>Cancelar</Button>
                        <Button onClick={handleSaveConfig}>Guardar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <AlertDialog open={showDeleteModal} onOpenChange={(open) => { if (!open) { setShowDeleteModal(false); setItemToDelete(null); } }}>
                <AlertDialogContent className="rounded-[var(--nc-radius-lg)]">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="text-danger" style={{ background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}>
                            <AlertTriangle size={20} />
                        </AlertDialogMedia>
                        <AlertDialogTitle className="text-ink">Confirmar Eliminación</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted">
                            ¿Estás seguro de que deseas eliminar {activeTab === 'study-fields' ? 'el campo de estudio' : 'la variable'}{' '}
                            <strong className="text-ink">{itemToDelete?.name}</strong>?
                            {activeTab === 'study-fields' && (
                                <span className="block mt-2 text-xs text-danger">
                                    Advertencia: Esto puede afectar variables asociadas a este campo de estudio.
                                </span>
                            )}
                            {activeTab === 'variables' && itemToDelete && isVariable(itemToDelete) && (
                                <span className="block mt-2 text-xs text-danger">
                                    Advertencia: no se puede eliminar si ya tiene observaciones registradas (se preservan los datos históricos).
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={activeTab === 'study-fields' ? handleDeleteStudyField : handleDeleteVariable}>
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <DistributionChartModal
                isOpen={distributionTarget !== null}
                onClose={() => setDistributionTarget(null)}
                variableId={distributionTarget?.id ?? null}
                name={distributionTarget?.name ?? ''}
                projectId={projectId}
            />
        </>
    );
};
