import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, X, Edit, Trash2, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Pagination } from '../ui/Pagination';
import { StudentCommercePopover } from '../ui/StudentCommercePopover';

export const CommercesView = () => {
    const [commerces, setCommerces] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCommerce, setEditingCommerce] = useState({ id: null, name: '', address: '', originalName: null, originalAddress: null });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCommerce, setNewCommerce] = useState({ name: '', address: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commerceToDelete, setCommerceToDelete] = useState(null);

    // Search, sort, pagination states
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const editInputRef = useRef(null);
    const toast = useToast();

    useEffect(() => {
        fetchCommerces();
    }, []);

    // Auto-focus on edit
    useEffect(() => {
        if (editingCommerce.id && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingCommerce.id]);

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchCommerces = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/api/commerces');
            setCommerces(data || []);
        } catch (err) {
            toast.error(`Error al cargar comercios: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ========== COMMERCES CRUD ==========
    const handleAddCommerce = async () => {
        if (!newCommerce.name.trim()) {
            toast.error('El nombre del comercio no puede estar vacio');
            return;
        }

        if (!newCommerce.address.trim()) {
            toast.error('La direccion del comercio no puede estar vacia');
            return;
        }

        try {
            const response = await apiFetch('/api/commerces', {
                method: 'POST',
                body: JSON.stringify({
                    name: newCommerce.name.trim(),
                    address: newCommerce.address.trim()
                })
            });

            setCommerces(prev => [...prev, response]);
            toast.success('Comercio creado exitosamente');
            setShowAddModal(false);
            setNewCommerce({ name: '', address: '' });
        } catch (err) {
            toast.error(`Error al crear comercio: ${err.message}`);
        }
    };

    const startEditingCommerce = (commerce) => {
        setEditingCommerce({
            id: commerce.id,
            name: commerce.name,
            address: commerce.address,
            originalName: commerce.name,
            originalAddress: commerce.address
        });
    };

    const handleSaveCommerceEdit = async () => {
        const trimmedName = editingCommerce.name.trim();
        const trimmedAddress = editingCommerce.address.trim();

        if (trimmedName === editingCommerce.originalName && trimmedAddress === editingCommerce.originalAddress) {
            toast.info('No se detectaron cambios');
            setEditingCommerce({ id: null, name: '', address: '', originalName: null, originalAddress: null });
            return;
        }

        if (!trimmedName) {
            toast.error('El nombre del comercio no puede estar vacio');
            return;
        }

        if (!trimmedAddress) {
            toast.error('La direccion del comercio no puede estar vacia');
            return;
        }

        try {
            await apiFetch(`/api/commerces/${editingCommerce.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: trimmedName, address: trimmedAddress })
            });

            setCommerces(prev =>
                prev.map(c =>
                    c.id === editingCommerce.id
                        ? { ...c, name: trimmedName, address: trimmedAddress }
                        : c
                )
            );

            toast.success('Comercio actualizado exitosamente');
            setEditingCommerce({ id: null, name: '', address: '', originalName: null, originalAddress: null });
        } catch (err) {
            toast.error(`Error al actualizar comercio: ${err.message}`);
        }
    };

    const confirmDeleteCommerce = (commerce) => {
        setCommerceToDelete(commerce);
        setShowDeleteModal(true);
    };

    const handleDeleteCommerce = async () => {
        if (!commerceToDelete) return;

        try {
            await apiFetch(`/api/commerces/${commerceToDelete.id}`, { method: 'DELETE' });

            setCommerces(prev => prev.filter(c => c.id !== commerceToDelete.id));
            toast.success('Comercio eliminado exitosamente');
            setShowDeleteModal(false);
            setCommerceToDelete(null);
        } catch (err) {
            toast.error(`Error al eliminar comercio: ${err.message}`);
        }
    };

    const cancelEditing = () => {
        setEditingCommerce({ id: null, name: '', address: '', originalName: null, originalAddress: null });
    };

    // ========== SORTING ==========
    const handleSort = (key) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // ========== FILTERING & SORTING ==========
    const getFilteredAndSortedData = () => {
        // Filter by search term
        let filtered = commerces.filter(commerce => {
            const searchLower = searchTerm.toLowerCase();
            return commerce.name.toLowerCase().includes(searchLower) ||
                   commerce.address.toLowerCase().includes(searchLower);
        });

        // Sort data
        filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
            {/* Header with Search and Add Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gestion de Comercios</h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            disabled={editingCommerce.id !== null}
                            placeholder={editingCommerce.id ? "Finaliza la edicion para buscar" : "Buscar..."}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={editingCommerce.id !== null}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Agregar</span>
                    </button>
                </div>
            </div>

            {/* Commerces Table */}
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
                                    <td colSpan="5" className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        {searchTerm ? 'No se encontraron resultados' : 'No hay comercios registrados'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map(commerce => (
                                    <tr
                                        key={commerce.id}
                                        className={`border-b border-gray-100 dark:border-gray-700 last:border-none transition-all ${
                                            editingCommerce.id === commerce.id
                                                ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{commerce.id}</td>
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                                            {editingCommerce.id === commerce.id ? (
                                                <input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={editingCommerce.name}
                                                    onChange={e => setEditingCommerce({ ...editingCommerce, name: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveCommerceEdit();
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                commerce.name
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {editingCommerce.id === commerce.id ? (
                                                <input
                                                    type="text"
                                                    value={editingCommerce.address}
                                                    onChange={e => setEditingCommerce({ ...editingCommerce, address: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveCommerceEdit();
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    className="w-full p-2 border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                commerce.address
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <StudentCommercePopover
                                                items={commerce.assigned_students || []}
                                                type="students"
                                            />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingCommerce.id === commerce.id ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveCommerceEdit}
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
                                                            onClick={() => startEditingCommerce(commerce)}
                                                            disabled={editingCommerce.id !== null}
                                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Editar"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => confirmDeleteCommerce(commerce)}
                                                            disabled={editingCommerce.id !== null}
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
                            Agregar Comercio
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={newCommerce.name}
                                    onChange={e => setNewCommerce({ ...newCommerce, name: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newCommerce.address) {
                                            handleAddCommerce();
                                        }
                                    }}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nombre del comercio"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Direccion
                                </label>
                                <input
                                    type="text"
                                    value={newCommerce.address}
                                    onChange={e => setNewCommerce({ ...newCommerce, address: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            handleAddCommerce();
                                        }
                                    }}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Direccion del comercio"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewCommerce({ name: '', address: '' });
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddCommerce}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && commerceToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertTriangle size={24} />
                            <h3 className="text-xl font-bold">Confirmar Eliminacion</h3>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300">
                            Estas seguro de que deseas eliminar el comercio{' '}
                            <strong>{commerceToDelete.name}</strong>?
                            <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                                Advertencia: Esto puede afectar registros de precios asociados a este comercio.
                            </span>
                        </p>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setCommerceToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteCommerce}
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
