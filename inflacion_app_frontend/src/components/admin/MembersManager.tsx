import { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { ArrowUpDown, Plus, Edit, UserMinus, Key, ArrowUp, ArrowDown } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { getReactSelectStyles } from '../../utils/reactSelectStyles';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Pagination } from '../ui/Pagination';
import { TableSkeleton } from '../ui/skeletons';
import { LoadingArea } from '../ui/LoadingArea';
import { EmptyState } from '../ui/EmptyState';
import { RoleTag } from '../ui/RoleTag';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Button } from '../ui/button';
import { UserManagementModal, type UserFormData, type UserManagementModalMode } from './UserManagementModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import type { ProjectMember } from '../../types/api';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

type SortKey = 'userId' | 'name' | 'email';

interface RoleFilterOption {
    value: string;
    label: string;
}

interface MembersManagerProps {
    projectId: number;
}

// Reemplaza al viejo UsersManager.tsx (borrado) -- GET /api/users pasó a
// ser superadmin-only en Fase R, así que un admin de proyecto normal
// necesita esta vista project-scoped en su lugar. Editar/crear usuarios y
// editar sus roles DE ESTE PROYECTO son ahora dos llamadas separadas
// (PUT /api/users/:id para name/email, POST /project-memberships para
// roles), porque el backend ya no acepta `roles` en el PUT de usuario.
// Borrar una cuenta completa es acción de plataforma (ver
// PlatformUsersManager) -- acá solo se puede quitar la membership.
export const MembersManager = ({ projectId }: MembersManagerProps) => {
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilterOption | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'userId', direction: 'asc' });

    // Modals
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [modalMode, setModalMode] = useState<UserManagementModalMode>('edit');
    const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);

    const itemsPerPage = 10;
    const toast = useToast();

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch<ProjectMember[]>(`/api/project-memberships?projectId=${projectId}`);
            setMembers(data);
        } catch (err) {
            toast.error(`Error al cargar miembros: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchMembers(); }, [projectId]);

    const handleCreateUser = () => {
        setSelectedMember(null);
        setModalMode('create');
        setShowUserModal(true);
    };

    const handleEditUser = (member: ProjectMember) => {
        setSelectedMember(member);
        setModalMode('edit');
        setShowUserModal(true);
    };

    const handleChangePassword = (member: ProjectMember) => {
        setSelectedMember(member);
        setShowPasswordModal(true);
    };

    const handleRemoveFromProject = (member: ProjectMember) => {
        setSelectedMember(member);
        setShowRemoveConfirm(true);
    };

    const handleSaveUser = async (formData: UserFormData) => {
        try {
            if (modalMode === 'create') {
                await apiFetch('/api/users', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        password: formData.password,
                        roles: formData.roles,
                        projectId,
                    })
                });
                toast.success('Usuario creado y agregado al proyecto exitosamente');
            } else {
                if (!selectedMember) return;
                await Promise.all([
                    apiFetch(`/api/users/${selectedMember.userId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ name: formData.name, email: formData.email, projectId })
                    }),
                    apiFetch('/api/project-memberships', {
                        method: 'POST',
                        body: JSON.stringify({ projectId, userId: selectedMember.userId, roles: formData.roles })
                    }),
                ]);
                toast.success('Usuario actualizado exitosamente');
            }
            fetchMembers();
            setShowUserModal(false);
        } catch (err) {
            toast.error(`Error: ${getErrorMessage(err)}`);
            throw err;
        }
    };

    const handleSavePassword = async (password: string) => {
        if (!selectedMember) return;
        try {
            await apiFetch(`/api/users/${selectedMember.userId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ password, projectId })
            });
            toast.success('Contraseña actualizada exitosamente');
            setShowPasswordModal(false);
        } catch (err) {
            toast.error(`Error al cambiar contraseña: ${getErrorMessage(err)}`);
            throw err;
        }
    };

    const handleConfirmRemove = async () => {
        if (!selectedMember) return;
        try {
            await apiFetch(`/api/project-memberships?projectId=${projectId}&userId=${selectedMember.userId}`, {
                method: 'DELETE'
            });
            toast.success('Miembro quitado del proyecto exitosamente');
            fetchMembers();
            setShowRemoveConfirm(false);
        } catch (err) {
            toast.error(`Error al quitar miembro: ${getErrorMessage(err)}`);
        }
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredMembers = useMemo(() => {
        return members
            .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.email.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(m => !roleFilter || m.roles.includes(roleFilter.value));
    }, [members, searchTerm, roleFilter]);

    const sortedMembers = useMemo(() => {
        const sorted = [...filteredMembers];
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
    }, [filteredMembers, sortConfig]);

    const paginatedMembers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedMembers.slice(start, start + itemsPerPage);
    }, [sortedMembers, currentPage]);

    const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);

    return (
        <>
            <Breadcrumbs items={[{ label: 'Administración' }, { label: 'Miembros' }]} />
            {/* Sin card propia: el cuerpo del panel ya es una sola superficie
                (.admin-surface en AdminDashboard) */}
            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-medium text-ink">Miembros del Proyecto</h3>
                    <Button onClick={handleCreateUser}>
                        <Plus size={18} />
                        <span>Nuevo Usuario</span>
                    </Button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input md:col-span-2"
                    />
                    <Select<RoleFilterOption>
                        placeholder="Filtrar por rol..."
                        isClearable
                        value={roleFilter}
                        options={[
                            { value: 'student', label: 'Estudiante' },
                            { value: 'monitor', label: 'Monitor' },
                            { value: 'admin', label: 'Admin' }
                        ]}
                        onChange={(option) => setRoleFilter(option)}
                        styles={getReactSelectStyles<RoleFilterOption>()}
                    />
                </div>

                {/* Table */}
                <LoadingArea isLoading={isLoading} skeleton={<TableSkeleton rows={5} columns={4} />}>
                    {filteredMembers.length === 0 ? (
                        <EmptyState
                            title="No se encontraron miembros"
                            description="No hay miembros de este proyecto que coincidan con los filtros aplicados."
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
                                            <th
                                                onClick={() => handleSort('userId')}
                                                className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    ID
                                                    {sortConfig.key === 'userId' ? (
                                                        sortConfig.direction === 'asc' ?
                                                            <ArrowUp size={14} className="text-accent-300" /> :
                                                            <ArrowDown size={14} className="text-accent-300" />
                                                    ) : (
                                                        <ArrowUpDown size={14} className="opacity-40" />
                                                    )}
                                                </div>
                                            </th>
                                            <th
                                                onClick={() => handleSort('name')}
                                                className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    Nombre
                                                    {sortConfig.key === 'name' ? (
                                                        sortConfig.direction === 'asc' ?
                                                            <ArrowUp size={14} className="text-accent-300" /> :
                                                            <ArrowDown size={14} className="text-accent-300" />
                                                    ) : (
                                                        <ArrowUpDown size={14} className="opacity-40" />
                                                    )}
                                                </div>
                                            </th>
                                            <th
                                                onClick={() => handleSort('email')}
                                                className="p-3 font-medium text-muted cursor-pointer hover:text-ink transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    Email
                                                    {sortConfig.key === 'email' ? (
                                                        sortConfig.direction === 'asc' ?
                                                            <ArrowUp size={14} className="text-accent-300" /> :
                                                            <ArrowDown size={14} className="text-accent-300" />
                                                    ) : (
                                                        <ArrowUpDown size={14} className="opacity-40" />
                                                    )}
                                                </div>
                                            </th>
                                            <th className="p-3 font-medium text-muted">Roles en el Proyecto</th>
                                            <th className="p-3 text-right font-medium text-muted">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedMembers.map(m => (
                                            <tr key={m.userId} className="hover:bg-accent-800/10 border-b last:border-none transition-colors" style={{ borderColor: 'var(--color-divider)' }}>
                                                <td className="p-3 text-muted">{m.userId}</td>
                                                <td className="p-3 font-medium text-ink">{m.name}</td>
                                                <td className="p-3 text-muted">{m.email}</td>
                                                <td className="p-3">
                                                    <div className="flex gap-2 flex-wrap">
                                                        {m.roles.map(r => <RoleTag key={r} role={r} />)}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(m)} className="text-accent-300" title="Editar usuario">
                                                            <Edit size={16} />
                                                            <span>Editar</span>
                                                        </Button>
                                                        <Button variant="ghost" size="icon-sm" onClick={() => handleChangePassword(m)} className="text-ink/70 hover:text-ink" title="Cambiar contraseña">
                                                            <Key size={16} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveFromProject(m)} className="text-danger hover:bg-danger/10" title="Quitar del proyecto">
                                                            <UserMinus size={16} />
                                                        </Button>
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
                                totalItems={sortedMembers.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}
                </LoadingArea>
            </div>

            {/* Modals */}
            <UserManagementModal
                isOpen={showUserModal}
                onClose={() => setShowUserModal(false)}
                user={selectedMember}
                onSave={handleSaveUser}
                mode={modalMode}
            />

            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                user={selectedMember}
                onSave={handleSavePassword}
            />

            <ConfirmModal
                isOpen={showRemoveConfirm}
                onClose={() => setShowRemoveConfirm(false)}
                onConfirm={handleConfirmRemove}
                title="Quitar del Proyecto"
                message={`¿Estás seguro de quitar a ${selectedMember?.name} de este proyecto? Sus observaciones históricas se conservan, pero perderá acceso y sus asignaciones/borradores de este proyecto se eliminarán.`}
                confirmText="Quitar"
                confirmType="danger"
            />
        </>
    );
};
