import { useState, useEffect, useMemo } from 'react';
import { Users, ArrowUpDown, Trash2, Shield, ShieldOff, ArrowUp, ArrowDown } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Pagination } from '../ui/Pagination';
import { TableSkeleton } from '../ui/TableSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { RoleTag } from '../ui/RoleTag';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Tooltip } from '../ui/Tooltip';
import type { User } from '../../types/api';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

type SortKey = 'id' | 'name' | 'email';

// Superadmin-only: cuentas de usuario a nivel plataforma (todos los
// proyectos). A diferencia de MembersManager (project-scoped, crea/edita
// usuarios vía /api/users con projectId), acá solo se gestiona lo que es
// inherentemente cross-proyecto: borrar una cuenta por completo y otorgar/
// revocar el flag 'superadmin'. Crear usuarios sigue siendo siempre
// project-scoped (POST /api/users exige projectId), así que no hay botón
// de "crear" acá -- eso vive en la vista de Miembros de cada proyecto.
export const PlatformUsersManager = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [roleChangeTarget, setRoleChangeTarget] = useState<{ user: User; grant: boolean } | null>(null);

    const itemsPerPage = 10;
    const toast = useToast();

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch<User[]>('/api/users');
            setUsers(data);
        } catch (err) {
            toast.error(`Error al cargar usuarios: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchUsers(); }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiFetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
            toast.success('Usuario eliminado exitosamente');
            setDeleteTarget(null);
            fetchUsers();
        } catch (err) {
            toast.error(`Error al eliminar usuario: ${getErrorMessage(err)}`);
        }
    };

    const handleConfirmRoleChange = async () => {
        if (!roleChangeTarget) return;
        const { user, grant } = roleChangeTarget;
        try {
            await apiFetch(`/api/users/${user.id}/roles`, {
                method: 'POST',
                body: JSON.stringify({ roles: grant ? ['superadmin'] : [] }),
            });
            toast.success(grant ? 'Superadmin otorgado' : 'Superadmin revocado');
            setRoleChangeTarget(null);
            fetchUsers();
        } catch (err) {
            toast.error(`Error al actualizar rol: ${getErrorMessage(err)}`);
        }
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const sortedUsers = useMemo(() => {
        const sorted = [...filteredUsers];
        sorted.sort((a, b) => {
            let aValue: string | number = a[sortConfig.key];
            let bValue: string | number = b[sortConfig.key];
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredUsers, sortConfig]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedUsers.slice(start, start + itemsPerPage);
    }, [sortedUsers, currentPage]);

    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

    return (
        <>
            <Breadcrumbs items={[{ label: 'Plataforma' }, { label: 'Usuarios' }]} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Usuarios de la Plataforma</h3>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 w-full sm:w-72"
                    />
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                    Esta lista incluye todos los usuarios de todos los proyectos. Para crear un usuario nuevo, hacelo desde la vista de Miembros de un proyecto específico.
                </p>

                {isLoading ? (
                    <TableSkeleton rows={5} columns={4} />
                ) : filteredUsers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No se encontraron usuarios"
                        description="No hay usuarios que coincidan con la búsqueda."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th onClick={() => handleSort('id')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                ID
                                                {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />) : <ArrowUpDown size={14} className="opacity-40" />}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('name')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Nombre
                                                {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />) : <ArrowUpDown size={14} className="opacity-40" />}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('email')} className="p-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center gap-2">
                                                Email
                                                {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />) : <ArrowUpDown size={14} className="opacity-40" />}
                                            </div>
                                        </th>
                                        <th className="p-3 text-gray-500 dark:text-gray-400">Rol de Plataforma</th>
                                        <th className="p-3 text-right text-gray-500 dark:text-gray-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedUsers.map(u => {
                                        const isSuperadmin = u.roles.includes('superadmin');
                                        return (
                                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-none transition-all">
                                                <td className="p-3 text-gray-600 dark:text-gray-400">{u.id}</td>
                                                <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">{u.name}</td>
                                                <td className="p-3 text-gray-700 dark:text-gray-300">{u.email}</td>
                                                <td className="p-3">
                                                    {isSuperadmin ? <RoleTag role="superadmin" /> : <span className="text-gray-400 dark:text-gray-500 text-sm">Ninguno</span>}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Tooltip content={isSuperadmin ? 'Revocar superadmin' : 'Otorgar superadmin'}>
                                                            <button
                                                                onClick={() => setRoleChangeTarget({ user: u, grant: !isSuperadmin })}
                                                                className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors text-sm font-medium ${
                                                                    isSuperadmin
                                                                        ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                }`}
                                                            >
                                                                {isSuperadmin ? <ShieldOff size={16} /> : <Shield size={16} />}
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip content="Eliminar cuenta">
                                                            <button
                                                                onClick={() => setDeleteTarget(u)}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-sm font-medium"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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

            <ConfirmModal
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Usuario"
                message={`¿Estás seguro de eliminar la cuenta de ${deleteTarget?.name}? Esta acción no se puede deshacer y afecta a toda la plataforma, no solo a un proyecto.`}
                confirmText="Eliminar"
                confirmType="danger"
            />

            <ConfirmModal
                isOpen={roleChangeTarget !== null}
                onClose={() => setRoleChangeTarget(null)}
                onConfirm={handleConfirmRoleChange}
                title={roleChangeTarget?.grant ? 'Otorgar Superadmin' : 'Revocar Superadmin'}
                message={
                    roleChangeTarget?.grant
                        ? `¿Otorgar acceso de superadmin a ${roleChangeTarget.user.name}? Podrá administrar todos los proyectos de la plataforma.`
                        : `¿Revocar el acceso de superadmin a ${roleChangeTarget?.user.name}?`
                }
                confirmText={roleChangeTarget?.grant ? 'Otorgar' : 'Revocar'}
                confirmType={roleChangeTarget?.grant ? 'primary' : 'danger'}
            />
        </>
    );
};
