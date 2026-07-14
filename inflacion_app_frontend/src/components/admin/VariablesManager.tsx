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
type SortKey = 'id' | 'name' | 'unit' | 'studyFieldName' | 'dataType';
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

export const VariablesManager = () => {
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
            const data = await apiFetch<StudentTasksResponse>('/api/student-tasks');
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
    }, [activeTab]);

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
                body: JSON.stringify({ name: newItemName.trim() })
            });

            setStudyFields(prev => [...prev, response]);
            toast.success('Campo de estudio creado exitosamente');
            setShowAddModal(false);
            setNewItemName('');
        } catch (err) {
            toast.error(`Error al crear campo de estudio: ${getErrorMessage(err)}`);
        }
    };

    const startEditingStudyField = (studyField: StudyField) => {
        setEditingItem({ id: studyField.id, name: studyField.name, unit: '', originalName: studyField.name, originalUnit: null });
    };

    const handleSaveStudyFieldEdit = async () => {
        const trimmedName = editingItem.name.trim();

        if (trimmedName === editingItem.originalName) {
            toast.info('No se detectaron cambios');
            setEditingItem({ id: null, name: '', unit: '', originalName: null, originalUnit: null });
            return;
        }

        if (!trimmedName) {
            toast.error('El nombre del campo de estudio no puede estar vacío');
            return;
        }

        try {
            await apiFetch(`/api/study-fields/${editingItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: trimmedName })
            });

            setStudyFields(prev =>
                prev.map(f => f.id === editingItem.id ? { ...f, name: trimmedName } : f)
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
            await apiFetch(`/api/study-fields/${itemToDelete.id}`, { method: 'DELETE' });

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
                body: JSON.stringify({ name: trimmedName, unit: trimmedUnit || undefined })
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
            await apiFetch(`/api/variables/${itemToDelete.id}`, { method: 'DELETE' });

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
                body: JSON.stringify({ name: configTarget.name, unit: configTarget.unit || undefined, config })
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
                return item.name.toLowerCase().includes(searchLower);
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

    return (
        <>
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Variables y Campos de Estudio' }]} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('variables')}
                        disabled={editingItem.id !== null}
                        className={`px-4 py-2 font-semibold transition border-b-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            activeTab === 'variables'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <VariableIcon size={18} />
                            Variables
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('study-fields')}
                        disabled={editingItem.id !== null}
                        className={`px-4 py-2 font-semibold transition border-b-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            activeTab === 'study-fields'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Tag size={18} />
                            Campos de Estudio
                        </div>
                    </button>
                </div>

                {/* Header with Search and Add Button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {activeTab === 'study-fields' ? 'Campos de Estudio' : 'Variables'}
                    </h3>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                disabled={editingItem.id !== null}
                                placeholder={editingItem.id ? "Finaliza la edición para buscar" : "Buscar..."}
                                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            disabled={editingItem.id !== null}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Agregar</span>
                        </button>
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
                                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                                        <th onClick={() => handleSort('id')} className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                ID
                                                {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />) : (<ArrowUpDown size={14} className="opacity-40" />)}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('name')} className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                Nombre
                                                {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />) : (<ArrowUpDown size={14} className="opacity-40" />)}
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedStudyFields.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay campos de estudio registrados'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedStudyFields.map(studyField => (
                                        <tr key={studyField.id} className={`border-b border-gray-100 dark:border-gray-700 last:border-none transition-all ${editingItem.id === studyField.id ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{studyField.id}</td>
                                            <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
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
                                                        className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                ) : studyField.name}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {editingItem.id === studyField.id ? (
                                                        <>
                                                            <button onClick={handleSaveStudyFieldEdit} className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="Guardar"><Check size={18} /></button>
                                                            <button onClick={cancelEditing} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Cancelar"><X size={18} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEditingStudyField(studyField)} disabled={editingItem.id !== null} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Editar"><Edit size={18} /></button>
                                                            <button onClick={() => confirmDeleteStudyField(studyField)} disabled={editingItem.id !== null} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Eliminar"><Trash2 size={18} /></button>
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
                                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                                        <th onClick={() => handleSort('id')} className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-2">ID {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />) : (<ArrowUpDown size={14} className="opacity-40" />)}</div>
                                        </th>
                                        <th onClick={() => handleSort('name')} className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-2">Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />) : (<ArrowUpDown size={14} className="opacity-40" />)}</div>
                                        </th>
                                        <th onClick={() => handleSort('dataType')} className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-2">Tipo {sortConfig.key === 'dataType' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />) : (<ArrowUpDown size={14} className="opacity-40" />)}</div>
                                        </th>
                                        <th onClick={() => handleSort('unit')} className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-2">Unidad {sortConfig.key === 'unit' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />) : (<ArrowUpDown size={14} className="opacity-40" />)}</div>
                                        </th>
                                        <th onClick={() => handleSort('studyFieldName')} className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-2">Campo de Estudio {sortConfig.key === 'studyFieldName' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />) : (<ArrowUpDown size={14} className="opacity-40" />)}</div>
                                        </th>
                                        <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedVariables.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay variables registradas'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedVariables.map(variable => (
                                        <tr key={variable.id} className={`border-b border-gray-100 dark:border-gray-700 last:border-none transition-all ${editingItem.id === variable.id ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{variable.id}</td>
                                            <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
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
                                                        className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                ) : variable.name}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded" title={configSummary(variable)}>
                                                    {DATA_TYPE_LABELS[variable.dataType]}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
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
                                                        className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                ) : (variable.unit || 'N/A')}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                {studyFields.find(f => f.id === variable.studyFieldId)?.name || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {editingItem.id === variable.id ? (
                                                        <>
                                                            <button onClick={handleSaveVariableEdit} className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="Guardar"><Check size={18} /></button>
                                                            <button onClick={cancelEditing} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Cancelar"><X size={18} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {(variable.dataType === 'categorical' || variable.dataType === 'boolean') && (
                                                                <button onClick={() => setDistributionTarget(variable)} disabled={editingItem.id !== null} className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Ver distribución"><AreaChart size={18} /></button>
                                                            )}
                                                            {variable.dataType !== 'boolean' && (
                                                                <button onClick={() => openConfigEditor(variable)} disabled={editingItem.id !== null} className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Editar configuración"><Settings size={18} /></button>
                                                            )}
                                                            <button onClick={() => startEditingVariable(variable)} disabled={editingItem.id !== null} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Editar"><Edit size={18} /></button>
                                                            <button onClick={() => confirmDeleteVariable(variable)} disabled={editingItem.id !== null} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Eliminar"><Trash2 size={18} /></button>
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
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            Agregar {activeTab === 'study-fields' ? 'Campo de Estudio' : 'Variable'}
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && activeTab === 'study-fields') handleAddStudyField();
                                    }}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder={`Nombre de ${activeTab === 'study-fields' ? 'el campo de estudio' : 'la variable'}`}
                                    autoFocus
                                />
                            </div>

                            {activeTab === 'variables' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo de Dato</label>
                                        <select
                                            value={newItemDataType}
                                            onChange={e => setNewItemDataType(e.target.value as VariableDataType)}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {(Object.keys(DATA_TYPE_LABELS) as VariableDataType[]).map(dt => (
                                                <option key={dt} value={dt}>{DATA_TYPE_LABELS[dt]}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Unidad de Medida (opcional)</label>
                                        <input
                                            type="text"
                                            value={newItemUnit}
                                            onChange={e => setNewItemUnit(e.target.value)}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="ej: 1 kg, 500 g, °C"
                                        />
                                    </div>

                                    {newItemDataType === 'numeric' && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newItemIsCurrency}
                                                onChange={e => setNewItemIsCurrency(e.target.checked)}
                                                className="h-4 w-4 rounded form-checkbox text-blue-600"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Es un valor monetario (₲)</span>
                                        </label>
                                    )}

                                    {newItemDataType === 'categorical' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Opciones (mínimo 2)</label>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={newItemOptionDraft}
                                                    onChange={e => setNewItemOptionDraft(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOptionDraft(); } }}
                                                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Agregar opción..."
                                                />
                                                <button type="button" onClick={addOptionDraft} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {newItemOptions.map(opt => (
                                                    <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                                                        {opt}
                                                        <button type="button" onClick={() => setNewItemOptions(prev => prev.filter(o => o !== opt))}><X size={12} /></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {newItemDataType === 'text' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Largo máximo (opcional)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={newItemMaxLength}
                                                onChange={e => setNewItemMaxLength(e.target.value)}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="ej: 500"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Campo de Estudio</label>
                                        <Select<StudyFieldOption>
                                            value={selectedStudyField}
                                            onChange={(option) => setSelectedStudyField(option)}
                                            options={studyFieldOptions}
                                            placeholder="Seleccionar campo de estudio"
                                            className="text-gray-800"
                                            styles={getReactSelectStyles<StudyFieldOption>(document.documentElement.classList.contains('dark'))}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => { setShowAddModal(false); resetAddForm(); }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={activeTab === 'study-fields' ? handleAddStudyField : handleAddVariable}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Config Edit Modal */}
            {configTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            Configuración de "{configTarget.name}"
                        </h3>

                        {configTarget.dataType === 'numeric' && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={configIsCurrency} onChange={e => setConfigIsCurrency(e.target.checked)} className="h-4 w-4 rounded form-checkbox text-blue-600" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Es un valor monetario (₲)</span>
                            </label>
                        )}

                        {configTarget.dataType === 'categorical' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Opciones (mínimo 2)</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={configOptionDraft}
                                        onChange={e => setConfigOptionDraft(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addConfigOptionDraft(); } }}
                                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Agregar opción..."
                                    />
                                    <button type="button" onClick={addConfigOptionDraft} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {configOptions.map(opt => (
                                        <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                                            {opt}
                                            <button type="button" onClick={() => setConfigOptions(prev => prev.filter(o => o !== opt))}><X size={12} /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {configTarget.dataType === 'text' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Largo máximo (opcional)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={configMaxLength}
                                    onChange={e => setConfigMaxLength(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={closeConfigEditor} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Cancelar</button>
                            <button onClick={handleSaveConfig} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && itemToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertTriangle size={24} />
                            <h3 className="text-xl font-bold">Confirmar Eliminación</h3>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300">
                            ¿Estás seguro de que deseas eliminar {activeTab === 'study-fields' ? 'el campo de estudio' : 'la variable'}{' '}
                            <strong>{itemToDelete.name}</strong>?
                            {activeTab === 'study-fields' && (
                                <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                                    Advertencia: Esto puede afectar variables asociadas a este campo de estudio.
                                </span>
                            )}
                            {activeTab === 'variables' && isVariable(itemToDelete) && (
                                <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                                    Advertencia: no se puede eliminar si ya tiene observaciones registradas (se preservan los datos históricos).
                                </span>
                            )}
                        </p>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={activeTab === 'study-fields' ? handleDeleteStudyField : handleDeleteVariable}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DistributionChartModal
                isOpen={distributionTarget !== null}
                onClose={() => setDistributionTarget(null)}
                variableId={distributionTarget?.id ?? null}
                name={distributionTarget?.name ?? ''}
            />
        </>
    );
};
