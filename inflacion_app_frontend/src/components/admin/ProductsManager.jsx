import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { Package, Tag, Search, Plus, Check, X, Edit, Trash2, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Pagination } from '../ui/Pagination';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const ProductsManager = () => {
    const [activeTab, setActiveTab] = useState('categories');
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState({ id: null, name: '', originalName: null });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Search, sort, pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const editInputRef = useRef(null);
    const toast = useToast();

    useEffect(() => {
        fetchData();
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

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/api/student-tasks');
            setCategories(data.categories || []);
            setProducts(data.products || []);
        } catch (err) {
            toast.error(`Error al cargar datos: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ========== CATEGORIES CRUD ==========
    const handleAddCategory = async () => {
        if (!newItemName.trim()) {
            toast.error('El nombre de la categoría no puede estar vacío');
            return;
        }

        try {
            const response = await apiFetch('/api/categories', {
                method: 'POST',
                body: JSON.stringify({ name: newItemName.trim() })
            });

            setCategories(prev => [...prev, response]);
            toast.success('Categoría creada exitosamente');
            setShowAddModal(false);
            setNewItemName('');
        } catch (err) {
            toast.error(`Error al crear categoría: ${err.message}`);
        }
    };

    const startEditingCategory = (category) => {
        setEditingItem({ id: category.id, name: category.name, originalName: category.name });
    };

    const handleSaveCategoryEdit = async () => {
        const trimmedName = editingItem.name.trim();

        if (trimmedName === editingItem.originalName) {
            toast.info('No se detectaron cambios');
            setEditingItem({ id: null, name: '', originalName: null });
            return;
        }

        if (!trimmedName) {
            toast.error('El nombre de la categoría no puede estar vacío');
            return;
        }

        try {
            await apiFetch(`/api/categories/${editingItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: trimmedName })
            });

            setCategories(prev =>
                prev.map(c => c.id === editingItem.id ? { ...c, name: trimmedName } : c)
            );

            toast.success('Categoría actualizada exitosamente');
            setEditingItem({ id: null, name: '', originalName: null });
        } catch (err) {
            toast.error(`Error al actualizar categoría: ${err.message}`);
        }
    };

    const confirmDeleteCategory = (category) => {
        setItemToDelete(category);
        setShowDeleteModal(true);
    };

    const handleDeleteCategory = async () => {
        if (!itemToDelete) return;

        try {
            await apiFetch(`/api/categories/${itemToDelete.id}`, { method: 'DELETE' });

            setCategories(prev => prev.filter(c => c.id !== itemToDelete.id));
            toast.success('Categoría eliminada exitosamente');
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (err) {
            toast.error(`Error al eliminar categoría: ${err.message}`);
        }
    };

    const cancelEditing = () => {
        setEditingItem({ id: null, name: '', originalName: null });
    };

    // ========== PRODUCTS CRUD ==========
    const handleAddProduct = async () => {
        if (!newItemName.trim()) {
            toast.error('El nombre del producto no puede estar vacío');
            return;
        }

        if (!selectedCategory) {
            toast.error('Debes seleccionar una categoría');
            return;
        }

        try {
            const response = await apiFetch('/api/products', {
                method: 'POST',
                body: JSON.stringify({
                    name: newItemName.trim(),
                    categoryId: selectedCategory.value
                })
            });

            setProducts(prev => [...prev, response]);
            toast.success('Producto creado exitosamente');
            setShowAddModal(false);
            setNewItemName('');
            setSelectedCategory(null);
        } catch (err) {
            toast.error(`Error al crear producto: ${err.message}`);
        }
    };

    const startEditingProduct = (product) => {
        setEditingItem({ id: product.id, name: product.name, originalName: product.name });
    };

    const handleSaveProductEdit = async () => {
        const trimmedName = editingItem.name.trim();

        if (trimmedName === editingItem.originalName) {
            toast.info('No se detectaron cambios');
            setEditingItem({ id: null, name: '', originalName: null });
            return;
        }

        if (!trimmedName) {
            toast.error('El nombre del producto no puede estar vacío');
            return;
        }

        try {
            await apiFetch(`/api/products/${editingItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: trimmedName })
            });

            setProducts(prev =>
                prev.map(p => p.id === editingItem.id ? { ...p, name: trimmedName } : p)
            );

            toast.success('Producto actualizado exitosamente');
            setEditingItem({ id: null, name: '', originalName: null });
        } catch (err) {
            toast.error(`Error al actualizar producto: ${err.message}`);
        }
    };

    const confirmDeleteProduct = (product) => {
        setItemToDelete(product);
        setShowDeleteModal(true);
    };

    const handleDeleteProduct = async () => {
        if (!itemToDelete) return;

        try {
            await apiFetch(`/api/products/${itemToDelete.id}`, { method: 'DELETE' });

            setProducts(prev => prev.filter(p => p.id !== itemToDelete.id));
            toast.success('Producto eliminado exitosamente');
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (err) {
            toast.error(`Error al eliminar producto: ${err.message}`);
        }
    };

    const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));

    // ========== SORTING ==========
    const handleSort = (key) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // ========== FILTERING & SORTING ==========
    const getFilteredAndSortedData = () => {
        const data = activeTab === 'categories' ? categories : products;

        // Filter by search term
        let filtered = data.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            if (activeTab === 'categories') {
                return item.name.toLowerCase().includes(searchLower);
            } else {
                const categoryName = categories.find(c => c.id === item.categoryId)?.name || '';
                return item.name.toLowerCase().includes(searchLower) ||
                       categoryName.toLowerCase().includes(searchLower);
            }
        });

        // Sort data
        filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Special handling for category name in products
            if (sortConfig.key === 'categoryName' && activeTab === 'products') {
                aValue = categories.find(c => c.id === a.categoryId)?.name || '';
                bValue = categories.find(c => c.id === b.categoryId)?.name || '';
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
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

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <>
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Productos y Categorías' }]} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('products')}
                        disabled={editingItem.id !== null}
                        className={`px-4 py-2 font-semibold transition border-b-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            activeTab === 'products'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Package size={18} />
                            Productos
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        disabled={editingItem.id !== null}
                        className={`px-4 py-2 font-semibold transition border-b-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            activeTab === 'categories'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Tag size={18} />
                            Categorías
                        </div>
                    </button>
                </div>

                {/* Header with Search and Add Button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {activeTab === 'categories' ? 'Categorías' : 'Productos'}
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
                ) : activeTab === 'categories' ? (
                    // Categories Table
                    <>
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
                                        <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay categorías registradas'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map(category => (
                                        <tr
                                            key={category.id}
                                            className={`border-b border-gray-100 dark:border-gray-700 last:border-none transition-all ${
                                                editingItem.id === category.id
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{category.id}</td>
                                            <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                                                {editingItem.id === category.id ? (
                                                    <input
                                                        ref={editInputRef}
                                                        type="text"
                                                        value={editingItem.name}
                                                        onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveCategoryEdit();
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                ) : (
                                                    category.name
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {editingItem.id === category.id ? (
                                                        <>
                                                            <button
                                                                onClick={handleSaveCategoryEdit}
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
                                                                onClick={() => startEditingCategory(category)}
                                                                disabled={editingItem.id !== null}
                                                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Editar"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => confirmDeleteCategory(category)}
                                                                disabled={editingItem.id !== null}
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
                        </div>
                        {/* Pagination for Categories */}
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                totalItems={filteredData.length}
                                itemsPerPage={itemsPerPage}
                            />
                        )}
                    </>
                ) : (
                    // Products Table
                    <>
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
                                            onClick={() => handleSort('categoryName')}
                                            className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                Categoría
                                                {sortConfig.key === 'categoryName' ? (
                                                    sortConfig.direction === 'asc' ?
                                                        <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> :
                                                        <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay productos registrados'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map(product => (
                                        <tr
                                            key={product.id}
                                            className={`border-b border-gray-100 dark:border-gray-700 last:border-none transition-all ${
                                                editingItem.id === product.id
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{product.id}</td>
                                            <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                                                {editingItem.id === product.id ? (
                                                    <input
                                                        ref={editInputRef}
                                                        type="text"
                                                        value={editingItem.name}
                                                        onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveProductEdit();
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                ) : (
                                                    product.name
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                {categories.find(c => c.id === product.categoryId)?.name || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {editingItem.id === product.id ? (
                                                        <>
                                                            <button
                                                                onClick={handleSaveProductEdit}
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
                                                                onClick={() => startEditingProduct(product)}
                                                                disabled={editingItem.id !== null}
                                                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Editar"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => confirmDeleteProduct(product)}
                                                                disabled={editingItem.id !== null}
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
                        </div>
                        {/* Pagination for Products */}
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                totalItems={filteredData.length}
                                itemsPerPage={itemsPerPage}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            Agregar {activeTab === 'categories' ? 'Categoría' : 'Producto'}
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            activeTab === 'categories' ? handleAddCategory() : handleAddProduct();
                                        }
                                    }}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder={`Nombre de ${activeTab === 'categories' ? 'la categoría' : 'el producto'}`}
                                    autoFocus
                                />
                            </div>

                            {activeTab === 'products' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Categoría
                                    </label>
                                    <Select
                                        value={selectedCategory}
                                        onChange={setSelectedCategory}
                                        options={categoryOptions}
                                        placeholder="Seleccionar categoría"
                                        className="text-gray-800"
                                        styles={getReactSelectStyles(document.documentElement.classList.contains('dark'))}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewItemName('');
                                    setSelectedCategory(null);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={activeTab === 'categories' ? handleAddCategory : handleAddProduct}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                                Agregar
                            </button>
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
                            ¿Estás seguro de que deseas eliminar {activeTab === 'categories' ? 'la categoría' : 'el producto'}{' '}
                            <strong>{itemToDelete.name}</strong>?
                            {activeTab === 'categories' && (
                                <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                                    Advertencia: Esto puede afectar productos asociados a esta categoría.
                                </span>
                            )}
                        </p>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setItemToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={activeTab === 'categories' ? handleDeleteCategory : handleDeleteProduct}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
