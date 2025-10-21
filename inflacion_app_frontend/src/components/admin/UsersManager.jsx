import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Users, ArrowUpDown, Plus, Edit, Trash2, Key, ArrowUp, ArrowDown } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Pagination } from '../ui/Pagination';
import { TableSkeleton } from '../ui/TableSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { RoleTag } from '../ui/RoleTag';
import { ConfirmModal } from '../ui/ConfirmModal';
import { UserManagementModal } from './UserManagementModal';
import { ChangePasswordModal } from './ChangePasswordModal';

export const UsersManager = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

    // Modals
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [modalMode, setModalMode] = useState('edit'); // 'create' or 'edit'
    const [selectedUser, setSelectedUser] = useState(null);

    const itemsPerPage = 10;
    const toast = useToast();
    const isDark = document.documentElement.classList.contains('dark');

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/api/users');
            setUsers(data);
        } catch (err) {
            toast.error(`Error al cargar usuarios: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // Handle Create
    const handleCreateUser = () => {
        setSelectedUser(null);
        setModalMode('create');
        setShowUserModal(true);
    };

    // Handle Edit
    const handleEditUser = (user) => {
        setSelectedUser(user);
        setModalMode('edit');
        setShowUserModal(true);
    };

    // Handle Change Password
    const handleChangePassword = (user) => {
        setSelectedUser(user);
        setShowPasswordModal(true);
    };

    // Handle Delete
    const handleDeleteUser = (user) => {
        setSelectedUser(user);
        setShowDeleteConfirm(true);
    };

    // Save User (Create or Update)
    const handleSaveUser = async (formData) => {
        try {
            if (modalMode === 'create') {
                await apiFetch('/api/users', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                toast.success('Usuario creado exitosamente');
            } else {
                await apiFetch(`/api/users/${selectedUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        roles: formData.roles
                    })
                });
                toast.success('Usuario actualizado exitosamente');
            }
            fetchUsers();
            setShowUserModal(false);
        } catch (err) {
            toast.error(`Error: ${err.message}`);
            throw err;
        }
    };

    // Save Password
    const handleSavePassword = async (password) => {
        try {
            await apiFetch(`/api/users/${selectedUser.id}/password`, {
                method: 'PUT',
                body: JSON.stringify({ password })
            });
            toast.success('Contraseña actualizada exitosamente');
            setShowPasswordModal(false);
        } catch (err) {
            toast.error(`Error al cambiar contraseña: ${err.message}`);
            throw err;
        }
    };

    // Confirm Delete
    const handleConfirmDelete = async () => {
        try {
            await apiFetch(`/api/users/${selectedUser.id}`, {
                method: 'DELETE'
            });
            toast.success('Usuario eliminado exitosamente');
            fetchUsers();
            setShowDeleteConfirm(false);
        } catch (err) {
            toast.error(`Error al eliminar usuario: ${err.message}`);
        }
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredUsers = useMemo(() => {
        return users
            .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(u => !roleFilter || u.roles.includes(roleFilter.value));
    }, [users, searchTerm, roleFilter]);

    const sortedUsers = useMemo(() => {
        let sorted = [...filteredUsers];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
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
        }
        return sorted;
    }, [filteredUsers, sortConfig]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedUsers.slice(start, start + itemsPerPage);
    }, [sortedUsers, currentPage]);

    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);

    return (
        <>
            <Breadcrumbs items={[{ label: 'Panel Admin' }, { label: 'Usuarios' }]} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gestión de Usuarios</h3>
                    <button
                        onClick={handleCreateUser}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span>Nuevo Usuario</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 md:col-span-2"
                    />
                    <Select
                        placeholder="Filtrar por rol..."
                        isClearable
                        value={roleFilter}
                        options={[
                            { value: 'student', label: 'Estudiante' },
                            { value: 'monitor', label: 'Monitor' },
                            { value: 'admin', label: 'Admin' }
                        ]}
                        onChange={setRoleFilter}
                        styles={getReactSelectStyles(isDark)}
                    />
                </div>

                {/* Table */}
                {isLoading ? (
                    <TableSkeleton rows={5} columns={4} />
                ) : filteredUsers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No se encontraron usuarios"
                        description="No hay usuarios que coincidan con los filtros aplicados."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th
                                            onClick={() => handleSort('id')}
                                            className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                ID
                                                {sortConfig.key === 'id' ? (
                                                    sortConfig.direction === 'asc' ?
                                                        <ArrowUp size={14} className="text-blue-600" /> :
                                                        <ArrowDown size={14} className="text-blue-600" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
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
                                            onClick={() => handleSort('email')}
                                            className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                Email
                                                {sortConfig.key === 'email' ? (
                                                    sortConfig.direction === 'asc' ?
                                                        <ArrowUp size={14} className="text-blue-600" /> :
                                                        <ArrowDown size={14} className="text-blue-600" />
                                                ) : (
                                                    <ArrowUpDown size={14} className="opacity-40" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="p-3 text-gray-500 dark:text-gray-400">Roles</th>
                                        <th className="p-3 text-right text-gray-500 dark:text-gray-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-none transition-all">
                                            <td className="p-3 text-gray-600 dark:text-gray-400">{u.id}</td>
                                            <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{u.name}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{u.email}</td>
                                            <td className="p-3">
                                                <div className="flex gap-2 flex-wrap">
                                                    {u.roles.map(r => <RoleTag key={r} role={r} />)}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditUser(u)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors text-sm font-medium"
                                                        title="Editar usuario"
                                                    >
                                                        <Edit size={16} />
                                                        <span>Editar</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleChangePassword(u)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors text-sm font-medium"
                                                        title="Cambiar contraseña"
                                                    >
                                                        <Key size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-sm font-medium"
                                                        title="Eliminar usuario"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
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
                            totalItems={sortedUsers.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>

            {/* Modals */}
            <UserManagementModal
                isOpen={showUserModal}
                onClose={() => setShowUserModal(false)}
                user={selectedUser}
                onSave={handleSaveUser}
                mode={modalMode}
            />

            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                user={selectedUser}
                onSave={handleSavePassword}
            />

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Usuario"
                message={`¿Estás seguro de eliminar a ${selectedUser?.name}? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                confirmType="danger"
            />
        </>
    );
};
