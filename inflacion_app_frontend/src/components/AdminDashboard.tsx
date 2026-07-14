import { useState } from 'react';
import { BarChart2, Users, Calendar, Settings, Variable as VariableIcon, Store, Menu, X } from 'lucide-react';
import { AnalysisView } from './admin/AnalysisView';
import { PeriodsManager } from './admin/PeriodsManager';
import { ObservationsManager } from './admin/ObservationsManager';
import { MembersManager } from './admin/MembersManager';
import { VariablesManager } from './admin/VariablesManager';
import { ObservationUnitsManager } from './admin/ObservationUnitsManager';
import { useProject } from '../contexts/ProjectContext';
import type { AuthUser } from '../types/api';

type AdminView = 'analysis' | 'periods' | 'records' | 'variables' | 'observation-units' | 'users';

function AdminDashboard({ user: _user }: { user: AuthUser }) {
    const [view, setView] = useState<AdminView>('analysis');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { activeProjectId } = useProject();

    const menuItems: { id: AdminView; label: string; icon: typeof BarChart2 }[] = [
        { id: 'analysis', label: 'Análisis', icon: BarChart2 },
        { id: 'periods', label: 'Períodos', icon: Calendar },
        { id: 'records', label: 'Registros', icon: Settings },
        { id: 'variables', label: 'Variables', icon: VariableIcon },
        { id: 'observation-units', label: 'Unidades de Observación', icon: Store },
        { id: 'users', label: 'Miembros', icon: Users },
    ];

    // Fase U garantiza que activeProjectId ya está resuelto para cuando
    // AdminDashboard llega a renderizar (ProjectRoleBridge gatea en isLoading
    // y en availableProjects vacío antes de montar este árbol) -- este check
    // es solo el boundary de tipos entre ProjectContext (number | null) y los
    // managers de acá abajo (que reciben projectId: number sin nullability).
    if (activeProjectId === null) {
        return null;
    }

    return (
        <>
            {/* Overlay para móvil */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Contenedor principal con bordes redondeados */}
            <div className="flex h-[calc(100vh-10rem)] md:h-auto overflow-hidden rounded-2xl shadow-xl">
                {/* Sidebar */}
                <aside className={`
                    fixed md:static inset-y-0 left-0 z-50
                    w-64 bg-white dark:bg-gray-800 flex flex-col p-4
                    border-r border-gray-200 dark:border-gray-700 shrink-0
                    transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 px-2">Panel Admin</h1>
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
                                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-grow flex flex-col overflow-hidden bg-white dark:bg-gray-800">
                {/* Header con botón hamburger para móvil */}
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

                {/* Contenido scrolleable */}
                <div className="flex-grow overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {view === 'analysis' && <AnalysisView projectId={activeProjectId} />}
                        {view === 'periods' && <PeriodsManager projectId={activeProjectId} />}
                        {view === 'records' && <ObservationsManager projectId={activeProjectId} />}
                        {view === 'variables' && <VariablesManager projectId={activeProjectId} />}
                        {view === 'observation-units' && <ObservationUnitsManager projectId={activeProjectId} />}
                        {view === 'users' && <MembersManager projectId={activeProjectId} />}
                    </div>
                </div>
            </main>
            </div>
        </>
    );
}

export default AdminDashboard;
