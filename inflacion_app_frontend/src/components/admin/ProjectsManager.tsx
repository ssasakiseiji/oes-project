import { useState, useEffect, type FormEvent } from 'react';
import { FolderKanban, Loader, Plus, X, Save, Edit, Archive, ArchiveRestore } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/TableSkeleton';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import type { Project } from '../../types/api';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

interface EditingProjectState {
    id: number;
    name: string;
    description: string;
}

// Superadmin-only: CRUD de Project a nivel plataforma (crear/listar/archivar).
// Vive en PlatformDashboard, no en AdminDashboard -- gestionar proyectos no
// depende de tener membership en ninguno en particular.
export const ProjectsManager = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [editingProject, setEditingProject] = useState<EditingProjectState | null>(null);

    const toast = useToast();

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch<Project[]>('/api/projects');
            setProjects(data);
        } catch (err) {
            toast.error(`Error al cargar proyectos: ${getErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchProjects(); }, []);

    const handleCreateProject = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newProject.name.trim()) {
            toast.error('El nombre del proyecto es requerido');
            return;
        }
        setIsCreating(true);
        try {
            await apiFetch('/api/projects', {
                method: 'POST',
                body: JSON.stringify({
                    name: newProject.name.trim(),
                    description: newProject.description.trim() || undefined,
                }),
            });
            toast.success('Proyecto creado exitosamente');
            setShowCreateForm(false);
            setNewProject({ name: '', description: '' });
            fetchProjects();
        } catch (err) {
            toast.error(`Error al crear proyecto: ${getErrorMessage(err)}`);
        } finally {
            setIsCreating(false);
        }
    };

    const startEditing = (project: Project) => {
        setEditingProject({ id: project.id, name: project.name, description: project.description ?? '' });
    };

    const handleSaveEdit = async () => {
        if (!editingProject) return;
        if (!editingProject.name.trim()) {
            toast.error('El nombre del proyecto es requerido');
            return;
        }
        try {
            await apiFetch(`/api/projects/${editingProject.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: editingProject.name.trim(),
                    description: editingProject.description.trim() || undefined,
                }),
            });
            toast.success('Proyecto actualizado exitosamente');
            setEditingProject(null);
            fetchProjects();
        } catch (err) {
            toast.error(`Error al actualizar proyecto: ${getErrorMessage(err)}`);
        }
    };

    const handleToggleArchived = async (project: Project) => {
        try {
            await apiFetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                body: JSON.stringify({ isArchived: !project.isArchived }),
            });
            toast.success(project.isArchived ? 'Proyecto reactivado' : 'Proyecto archivado');
            fetchProjects();
        } catch (err) {
            toast.error(`Error al actualizar proyecto: ${getErrorMessage(err)}`);
        }
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Plataforma' }, { label: 'Proyectos' }]} />

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {showCreateForm ? 'Crear Nuevo Proyecto' : 'Proyectos de la Plataforma'}
                    </h3>
                    {!showCreateForm && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <Plus size={18} />
                            Nuevo Proyecto
                        </button>
                    )}
                </div>

                {showCreateForm && (
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Nombre</label>
                                <input
                                    type="text"
                                    value={newProject.name}
                                    onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 w-full"
                                    placeholder="ej: Encuesta de Precios"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Descripción (opcional)</label>
                                <input
                                    type="text"
                                    value={newProject.description}
                                    onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 w-full"
                                    placeholder="ej: Recolección mensual de precios al consumidor"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => { setShowCreateForm(false); setNewProject({ name: '', description: '' }); }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition flex items-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader className="animate-spin" size={16} />
                                        Creando...
                                    </>
                                ) : (
                                    'Crear Proyecto'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in space-y-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Todos los Proyectos</h3>

                {isLoading ? (
                    <TableSkeleton rows={3} columns={4} />
                ) : projects.length === 0 ? (
                    <EmptyState
                        icon={FolderKanban}
                        title="No hay proyectos registrados"
                        description="Crea el primer proyecto de recolección de datos para empezar."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="p-3 text-gray-500 dark:text-gray-400">Nombre</th>
                                    <th className="p-3 text-gray-500 dark:text-gray-400">Descripción</th>
                                    <th className="p-3 text-gray-500 dark:text-gray-400">Estado</th>
                                    <th className="p-3 text-right text-gray-500 dark:text-gray-400">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-none transition-all">
                                        <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">
                                            {editingProject?.id === p.id ? (
                                                <input
                                                    type="text"
                                                    value={editingProject.name}
                                                    onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') setEditingProject(null);
                                                    }}
                                                    className="w-full p-1 border-2 border-blue-500 dark:border-blue-400 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                                />
                                            ) : p.name}
                                        </td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400">
                                            {editingProject?.id === p.id ? (
                                                <input
                                                    type="text"
                                                    value={editingProject.description}
                                                    onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') setEditingProject(null);
                                                    }}
                                                    className="w-full p-1 border-2 border-blue-500 dark:border-blue-400 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                                                />
                                            ) : (p.description || <span className="text-gray-400 italic">Sin descripción</span>)}
                                        </td>
                                        <td className="p-3">
                                            <Tooltip content={p.isArchived ? 'Proyecto archivado' : 'Proyecto activo'}>
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                                    p.isArchived
                                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                }`}>
                                                    {p.isArchived ? 'Archivado' : 'Activo'}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingProject?.id === p.id ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition"
                                                        >
                                                            <Save size={14} />
                                                            Guardar
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingProject(null)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Tooltip content="Editar proyecto">
                                                            <button
                                                                onClick={() => startEditing(p)}
                                                                className="flex items-center gap-1 px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors text-sm font-medium"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip content={p.isArchived ? 'Reactivar proyecto' : 'Archivar proyecto'}>
                                                            <button
                                                                onClick={() => handleToggleArchived(p)}
                                                                className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors text-sm font-medium ${
                                                                    p.isArchived
                                                                        ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                                }`}
                                                            >
                                                                {p.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
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
                )}
            </div>
        </div>
    );
};
