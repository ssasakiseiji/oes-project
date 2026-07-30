import { useState, useEffect, type FormEvent } from 'react';
import { FolderKanban, Loader, Plus, X, Save, Edit, Archive, ArchiveRestore } from 'lucide-react';
import { apiFetch } from '../../api';
import { useToast } from '../Toast';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/TableSkeleton';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Tooltip } from '../ui/Tooltip';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
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

            <div className="card elev-sm p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-ink">Todos los Proyectos</h3>
                    <Button onClick={() => setShowCreateForm(true)}>
                        <Plus size={18} />
                        <span className="hidden sm:inline">Nuevo Proyecto</span>
                    </Button>
                </div>

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
                                <tr className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
                                    <th className="p-3 font-medium text-muted">Nombre</th>
                                    <th className="p-3 font-medium text-muted">Descripción</th>
                                    <th className="p-3 font-medium text-muted">Estado</th>
                                    <th className="p-3 text-right font-medium text-muted">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(p => (
                                    <tr key={p.id} className="hover:bg-accent-800/10 border-b last:border-none transition-colors" style={{ borderColor: 'var(--color-divider)' }}>
                                        <td className="p-3 font-medium text-ink">
                                            {editingProject?.id === p.id ? (
                                                <input
                                                    type="text"
                                                    value={editingProject.name}
                                                    onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') setEditingProject(null);
                                                    }}
                                                    className="input"
                                                />
                                            ) : p.name}
                                        </td>
                                        <td className="p-3 text-muted">
                                            {editingProject?.id === p.id ? (
                                                <input
                                                    type="text"
                                                    value={editingProject.description}
                                                    onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') setEditingProject(null);
                                                    }}
                                                    className="input"
                                                />
                                            ) : (p.description || <span className="italic">Sin descripción</span>)}
                                        </td>
                                        <td className="p-3">
                                            <Tooltip content={p.isArchived ? 'Proyecto archivado' : 'Proyecto activo'}>
                                                <span className={`tag ${p.isArchived ? 'tag-neutral' : 'tag-accent'}`}>
                                                    {p.isArchived ? 'Archivado' : 'Activo'}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {editingProject?.id === p.id ? (
                                                    <>
                                                        <Button size="sm" onClick={handleSaveEdit}>
                                                            <Save size={14} />
                                                            Guardar
                                                        </Button>
                                                        <Button size="icon-sm" variant="ghost" onClick={() => setEditingProject(null)} className="text-muted hover:text-ink">
                                                            <X size={14} />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Tooltip content="Editar proyecto">
                                                            <Button size="icon-sm" variant="ghost" onClick={() => startEditing(p)} className="text-accent-300">
                                                                <Edit size={14} />
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip content={p.isArchived ? 'Reactivar proyecto' : 'Archivar proyecto'}>
                                                            <Button
                                                                size="icon-sm"
                                                                variant="ghost"
                                                                onClick={() => handleToggleArchived(p)}
                                                                className={p.isArchived ? 'text-success hover:bg-success/10' : 'text-muted hover:text-ink'}
                                                            >
                                                                {p.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                                            </Button>
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

            {/* Create Project Dialog */}
            <Dialog open={showCreateForm} onOpenChange={(open) => { setShowCreateForm(open); if (!open) setNewProject({ name: '', description: '' }); }}>
                <DialogContent className="rounded-[var(--nc-radius-lg)] w-full max-w-lg sm:max-w-lg">
                    <DialogTitle className="text-xl font-medium text-ink">Crear Nuevo Proyecto</DialogTitle>
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div className="field">
                            <label>Nombre</label>
                            <input
                                type="text"
                                value={newProject.name}
                                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                className="input"
                                placeholder="ej: Encuesta de Precios"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Descripción (opcional)</label>
                            <input
                                type="text"
                                value={newProject.description}
                                onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                className="input"
                                placeholder="ej: Recolección mensual de precios al consumidor"
                            />
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <Button type="button" variant="secondary" onClick={() => { setShowCreateForm(false); setNewProject({ name: '', description: '' }); }}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating ? (
                                    <>
                                        <Loader className="animate-spin" size={16} />
                                        Creando...
                                    </>
                                ) : (
                                    'Crear Proyecto'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
