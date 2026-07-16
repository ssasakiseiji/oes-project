import { useState } from 'react';
import { FolderKanban, Users, Menu, X } from 'lucide-react';
import { ProjectsManager } from './admin/ProjectsManager';
import { PlatformUsersManager } from './admin/PlatformUsersManager';

type PlatformView = 'projects' | 'users';

// Modo "Plataforma" para superadmins: gestión project-agnostic (CRUD de
// Project + usuarios cross-proyecto). Deliberadamente no consume
// ProjectContext -- es el único árbol de la UI que no está atado a un
// proyecto activo. Ver el toggle "Modo Plataforma" en DashboardPage.tsx.
function PlatformDashboard() {
    const [view, setView] = useState<PlatformView>('projects');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const menuItems: { id: PlatformView; label: string; icon: typeof FolderKanban }[] = [
        { id: 'projects', label: 'Proyectos', icon: FolderKanban },
        { id: 'users', label: 'Usuarios', icon: Users },
    ];

    return (
        <>
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex h-[calc(100vh-10rem)] md:h-auto overflow-hidden">
                <aside className={`
                    fixed md:static inset-y-0 left-0 z-50
                    w-64 card elev-sm rounded-none md:rounded-[var(--nc-radius-lg)] flex flex-col p-4 gap-1 shrink-0
                    transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-xl font-medium text-ink px-2">Plataforma</h1>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="btn btn-icon btn-secondary rounded-full md:hidden"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <nav className="flex-grow space-y-1">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setView(item.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--nc-radius-md)] text-left text-sm font-medium transition-colors ${
                                    view === item.id
                                        ? 'bg-accent-2-800 text-accent-2-100'
                                        : 'text-ink/80 hover:bg-nc-neutral-500/10'
                                }`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-grow flex flex-col overflow-hidden">
                    <div className="md:hidden border-b p-4 flex items-center gap-3" style={{ borderColor: 'var(--color-divider)' }}>
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="btn btn-icon btn-secondary rounded-full"
                        >
                            <Menu size={20} />
                        </button>
                        <h2 className="text-base font-medium text-ink">
                            {menuItems.find(item => item.id === view)?.label}
                        </h2>
                    </div>

                    <div className="flex-grow overflow-y-auto py-4 md:py-2 md:px-6">
                        <div className="max-w-7xl mx-auto">
                            {view === 'projects' && <ProjectsManager />}
                            {view === 'users' && <PlatformUsersManager />}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

export default PlatformDashboard;
