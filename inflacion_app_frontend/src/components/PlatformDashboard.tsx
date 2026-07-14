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

            <div className="flex h-[calc(100vh-10rem)] md:h-auto overflow-hidden rounded-2xl shadow-xl">
                <aside className={`
                    fixed md:static inset-y-0 left-0 z-50
                    w-64 bg-white dark:bg-gray-800 flex flex-col p-4
                    border-r border-gray-200 dark:border-gray-700 shrink-0
                    transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 px-2">Plataforma</h1>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                            <X size={20} className="text-gray-600 dark:text-gray-300" />
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
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-semibold transition ${
                                    view === item.id
                                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-grow flex flex-col overflow-hidden bg-white dark:bg-gray-800">
                    <div className="md:hidden border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                            <Menu size={24} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                            {menuItems.find(item => item.id === view)?.label}
                        </h2>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 md:p-8">
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
