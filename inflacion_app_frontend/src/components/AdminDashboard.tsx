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

            {/* Contenedor principal -- un solo nivel de superficie (el sidebar); el
                área de contenido queda sin fondo propio, flotando sobre --color-bg */}
            <div className="flex h-[calc(100vh-10rem)] md:h-auto overflow-hidden">
                {/* Sidebar */}
                <aside className={`
                    fixed md:static inset-y-0 left-0 z-50
                    w-64 card elev-sm rounded-none md:rounded-[var(--nc-radius-lg)] flex flex-col p-4 gap-1 shrink-0
                    transform transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-medium text-ink px-2">Panel Admin</h1>
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
                                    ? 'bg-accent-800 text-accent-100'
                                    : 'text-ink/80 hover:bg-nc-neutral-500/10'
                            }`}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-grow flex flex-col overflow-hidden">
                {/* Header con botón hamburger para móvil */}
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

                {/* Contenido scrolleable */}
                <div className="flex-grow overflow-y-auto py-4 md:py-2 md:px-6">
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
