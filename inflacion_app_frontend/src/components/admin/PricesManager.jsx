import React, { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';
import { Filter, MoreVertical, Download, Search, Check, X, Edit, Trash2, AlertTriangle, Database, SlidersHorizontal, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import { Pagination } from '../ui/Pagination';
import { TableSkeleton } from '../ui/TableSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmModal } from '../ui/ConfirmModal';

export const PricesManager = () => {
    const [prices, setPrices] = useState([]);
    const [filters, setFilters] = useState({});
    const [selectedFilters, setSelectedFilters] = useState({
        periodId: null,
        categoryId: null,
        productId: null,
        userId: null,
        commerceId: null,
        showOutliersOnly: false
    });
    const [filterOptions, setFilterOptions] = useState({ periods: [], categories: [], products: [], users: [], commerces: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [editingPrice, setEditingPrice] = useState({ id: null, value: '', originalValue: null });
    const [showFilters, setShowFilters] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, priceId: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const itemsPerPage = 10;
    const toast = useToast();
    const isDark = document.documentElement.classList.contains('dark');
    const searchInputRef = useRef(null);
    const exportMenuRef = useRef(null);
    const editInputRef = useRef(null);

    // Keyboard shortcuts
    useHotkeys('ctrl+k, cmd+k', (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
    }, { enableOnFormTags: true });

    useHotkeys('ctrl+e, cmd+e', (e) => {
        e.preventDefault();
        if (prices.length > 0) {
            const headers = [
                { key: 'productName', label: 'Producto' },
                { key: 'categoryName', label: 'Categoría' },
                { key: 'price', label: 'Precio (₲)' },
                { key: 'commerceName', label: 'Comercio' },
                { key: 'userName', label: 'Estudiante' },
                { key: 'createdAt', label: 'Fecha' }
            ];
            exportToCSV(sortedPrices, 'precios_registrados', headers);
            toast.success('Datos exportados a CSV (Ctrl+E)');
        }
    });

    useHotkeys('ctrl+slash, cmd+slash', (e) => {
        e.preventDefault();
        setShowFilters(prev => !prev);
    });

    useEffect(() => {
        const loadFilterOptions = async () => {
            const [p, t, u] = await Promise.all([apiFetch('/api/periods'), apiFetch('/api/student-tasks'), apiFetch('/api/users')]);

            // Agregar opciones especiales al inicio de períodos
            const specialPeriods = [
                { id: 'ALL', name: '📋 Todos los Períodos', special: true },
                { id: 'LATEST', name: '🕐 Último Período', special: true }
            ];

            const allPeriods = [...specialPeriods, ...p];

            setFilterOptions({
                periods: allPeriods,
                categories: t.categories,
                products: t.products,
                users: u,
                commerces: t.assignedCommerces
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
        const handleClickOutside = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
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
        if (editingPrice.id && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingPrice.id]);

    useEffect(() => {
        const fetchPrices = async () => {
            setIsLoading(true);
            const validFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v != null && v !== ''));
            const params = new URLSearchParams(validFilters);
            try {
                const data = await apiFetch(`/api/prices?${params.toString()}`);
                setPrices(data);
            } catch (err) {
                toast.error(`Error al cargar precios: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrices();
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setSelectedFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        setCurrentPage(1);
        const newFilters = {};
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
            categoryId: null,
            productId: null,
            userId: null,
            commerceId: null,
            showOutliersOnly: false
        });
        setFilters(defaultPeriodId ? { periodId: defaultPeriodId } : {});
        setCurrentPage(1);
        toast.success('Filtros limpiados - Mostrando último período');
    };

    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(v => v !== null && v !== false && v !== '').length;
    }, [filters]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedPrices = useMemo(() => {
        let sorted = [...prices];

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            sorted = sorted.filter(p =>
                p.productName?.toLowerCase().includes(search) ||
                p.commerceName?.toLowerCase().includes(search) ||
                p.userName?.toLowerCase().includes(search) ||
                p.price?.toString().includes(search)
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [prices, sortConfig, searchTerm]);

    const paginatedPrices = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedPrices.slice(start, start + itemsPerPage);
    }, [sortedPrices, currentPage]);

    const totalPages = Math.ceil(sortedPrices.length / itemsPerPage);

    const handleSaveEdit = async (priceId) => {
        const newValue = parseInt(editingPrice.value);

        // Validar que el valor cambió
        if (newValue === editingPrice.originalValue) {
            toast.info('No se detectaron cambios');
            setEditingPrice({ id: null, value: '', originalValue: null });
            return;
        }

        // Validar que el valor es válido
        if (isNaN(newValue) || newValue <= 0) {
            toast.error('El precio debe ser un número mayor a 0');
            return;
        }

        try {
            await apiFetch(`/api/prices/${priceId}`, { method: 'PUT', body: JSON.stringify({ price: newValue }) });

            // Actualizar el precio localmente sin recargar toda la tabla
            setPrices(prevPrices =>
                prevPrices.map(p =>
                    p.id === priceId ? { ...p, price: newValue } : p
                )
            );

            toast.success('Precio actualizado exitosamente');
            setEditingPrice({ id: null, value: '', originalValue: null });
        } catch (err) {
            toast.error(`Error al actualizar precio: ${err.message}`);
        }
    };

    const startEditing = (price) => {
        const intPrice = Math.floor(price.price);
        setEditingPrice({ id: price.id, value: intPrice.toString(), originalValue: intPrice });
    };

    const cancelEditing = () => {
        setEditingPrice({ id: null, value: '', originalValue: null });
    };

    const handleDelete = async (priceId) => {
        setConfirmModal({ isOpen: true, priceId });
    };

    const confirmDelete = async () => {
        try {
            await apiFetch(`/api/prices/${confirmModal.priceId}`, { method: 'DELETE' });

            // Eliminar el registro localmente sin recargar toda la tabla
            setPrices(prevPrices => prevPrices.filter(p => p.id !== confirmModal.priceId));

            toast.success('Registro eliminado exitosamente');
            setConfirmModal({ isOpen: false, priceId: null });
        } catch (err) {
            toast.error(`Error al eliminar registro: ${err.message}`);
        }
    };

    return (
        <>
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Registros' }]} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
                {/* Header con título y botones de acción */}
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Auditoría de Registros</h3>
                    <div className="flex items-center gap-2">
                        <Tooltip content={editingPrice.id ? "Finaliza la edición para usar filtros" : "Toggle Filtros (Ctrl+/)"}>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                disabled={editingPrice.id !== null}
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
                            <Tooltip content={editingPrice.id ? "Finaliza la edición para exportar" : "Opciones de exportación"}>
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    disabled={prices.length === 0 || editingPrice.id !== null}
                                    className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <MoreVertical size={20} />
                                </button>
                            </Tooltip>
                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden z-50 animate-scale-in">
                                    <button
                                        onClick={() => {
                                            const headers = [
                                                { key: 'productName', label: 'Producto' },
                                                { key: 'categoryName', label: 'Categoría' },
                                                { key: 'price', label: 'Precio (₲)' },
                                                { key: 'commerceName', label: 'Comercio' },
                                                { key: 'userName', label: 'Estudiante' },
                                                { key: 'createdAt', label: 'Fecha' }
                                            ];
                                            exportToCSV(sortedPrices, 'precios_registrados', headers);
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
                                            const headers = [
                                                { key: 'productName', label: 'Producto' },
                                                { key: 'categoryName', label: 'Categoría' },
                                                { key: 'price', label: 'Precio (₲)' },
                                                { key: 'commerceName', label: 'Comercio' },
                                                { key: 'userName', label: 'Estudiante' },
                                                { key: 'createdAt', label: 'Fecha' }
                                            ];
                                            exportToExcel(sortedPrices, 'precios_registrados', headers, 'Precios');
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
                            placeholder={editingPrice.id ? "Finaliza la edición para buscar" : "Buscar por producto, comercio o estudiante... (Ctrl+K)"}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={editingPrice.id !== null}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {searchTerm && !editingPrice.id && (
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
                            {sortedPrices.length} resultado{sortedPrices.length !== 1 ? 's' : ''}
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
                                <Select
                                    placeholder="Seleccionar período..."
                                    value={filterOptions.periods.find(o => o.id === selectedFilters.periodId) ? {value: selectedFilters.periodId, label: filterOptions.periods.find(o => o.id === selectedFilters.periodId)?.name} : null}
                                    options={filterOptions.periods.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('periodId', v?.value || null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Categoría</label>
                                <Select
                                    placeholder="Seleccionar categoría..."
                                    value={filterOptions.categories.find(o => o.id === selectedFilters.categoryId) ? {value: selectedFilters.categoryId, label: filterOptions.categories.find(o => o.id === selectedFilters.categoryId)?.name} : null}
                                    options={filterOptions.categories.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('categoryId', v?.value || null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Producto</label>
                                <Select
                                    placeholder="Seleccionar producto..."
                                    value={filterOptions.products.find(o => o.id === selectedFilters.productId) ? {value: selectedFilters.productId, label: filterOptions.products.find(o => o.id === selectedFilters.productId)?.name} : null}
                                    options={filterOptions.products.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('productId', v?.value || null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Estudiante</label>
                                <Select
                                    placeholder="Seleccionar estudiante..."
                                    value={filterOptions.users.find(o => o.id === selectedFilters.userId) ? {value: selectedFilters.userId, label: filterOptions.users.find(o => o.id === selectedFilters.userId)?.name} : null}
                                    options={filterOptions.users.map(o=>({value:o.id, label:o.name}))}
                                    onChange={v => handleFilterChange('userId', v?.value || null)}
                                    isClearable
                                    styles={getReactSelectStyles(isDark)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Comercio</label>
                                <Select
                                    placeholder="Seleccionar comercio..."
                                    value={filterOptions.commerces?.find(o => o.id === selectedFilters.commerceId) ? {value: selectedFilters.commerceId, label: filterOptions.commerces?.find(o => o.id === selectedFilters.commerceId)?.name} : null}
                                    options={filterOptions.commerces?.map(o=>({value:o.id, label:o.name})) || []}
                                    onChange={v => handleFilterChange('commerceId', v?.value || null)}
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
                ) : prices.length === 0 ? (
                    <EmptyState
                        icon={Database}
                        title="No hay registros de precios"
                        description="Los estudiantes aún no han registrado precios, o los filtros aplicados no coinciden con ningún registro."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th onClick={() => handleSort('productName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Producto
                                                {sortConfig.key === 'productName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('categoryName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Categoría
                                                {sortConfig.key === 'categoryName' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('price')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Precio
                                                {sortConfig.key === 'price' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('commerceName')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Comercio
                                                {sortConfig.key === 'commerceName' ? (
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
                                {paginatedPrices.map(p => (
                            <tr key={p.id} className={`border-b border-gray-100 dark:border-gray-700 last:border-none transition-all ${
                                editingPrice.id === p.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset'
                                    : p.isOutlier
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}>
                                <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{p.productName}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">
                                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                        {p.categoryName}
                                    </span>
                                </td>
                                <td className="p-3 font-mono text-gray-800 dark:text-gray-100">
                                    {editingPrice.id === p.id ? (
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={editingPrice.value ? new Intl.NumberFormat('es-PY').format(parseInt(editingPrice.value) || 0) : ''}
                                            onChange={e => {
                                                const value = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                                setEditingPrice({...editingPrice, value: value});
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveEdit(p.id);
                                                if (e.key === 'Escape') cancelEditing();
                                            }}
                                            className="w-32 p-1 border-2 border-blue-500 dark:border-blue-400 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>{new Intl.NumberFormat('es-PY').format(p.price)}</span>
                                            {p.isOutlier && <AlertTriangle size={16} className="text-yellow-500 dark:text-yellow-400"/>}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{p.commerceName}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{p.userName}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{p.periodName}</td>
                                <td className="p-3">
                                    <div className="flex gap-1">
                                        {editingPrice.id === p.id ? (
                                            <>
                                                <Tooltip content="Guardar (Enter)">
                                                    <button
                                                        onClick={() => handleSaveEdit(p.id)}
                                                        disabled={parseInt(editingPrice.value) === editingPrice.originalValue}
                                                        className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                <Tooltip content="Editar precio">
                                                    <button
                                                        onClick={() => startEditing(p)}
                                                        disabled={editingPrice.id !== null}
                                                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Edit size={16} className="text-blue-600 dark:text-blue-400"/>
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Eliminar registro">
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        disabled={editingPrice.id !== null}
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
                            totalItems={sortedPrices.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, priceId: null })}
                onConfirm={confirmDelete}
                title="Confirmar eliminación"
                message="¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer."
            />
        </>
    );
};
