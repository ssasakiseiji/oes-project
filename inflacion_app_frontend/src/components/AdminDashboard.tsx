import { useState } from 'react';
import { PresentacionOverlay } from '../presentacion/PresentacionOverlay';
import { AnalysisView } from './admin/AnalysisView';
import { PeriodsManager } from './admin/PeriodsManager';
import { ObservationsManager } from './admin/ObservationsManager';
import { MembersManager } from './admin/MembersManager';
import { VariablesManager } from './admin/VariablesManager';
import { ObservationUnitsManager } from './admin/ObservationUnitsManager';
import { useProject } from '../contexts/ProjectContext';
import { useRole } from '../contexts/RoleContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { AuthUser } from '../types/api';

type AdminView = 'analysis' | 'periods' | 'records' | 'variables' | 'observation-units' | 'users';

// El panel admin no es responsive y no está pensado para serlo: sidebar fijo de
// 256px al lado de tablas anchas. Por debajo de este ancho la vista no se
// degrada, se reemplaza por un aviso -- y desde ahí se puede seguir trabajando
// con el header, que queda montado (vive en DashboardPage, no acá) y conserva
// todos sus controles: cambiar de rol o de proyecto lleva a vistas que sí
// funcionan en móvil.
const ADMIN_MIN_WIDTH_QUERY = '(min-width: 1024px)';

function AdminDashboard({ user: _user }: { user: AuthUser }) {
    const [view, setView] = useState<AdminView>('analysis');
    const [presentacionAbierta, setPresentacionAbierta] = useState(false);
    const { activeProjectId, hasMultipleProjects } = useProject();
    const { hasMultipleRoles } = useRole();
    const isWideEnough = useMediaQuery(ADMIN_MIN_WIDTH_QUERY);

    // Salidas reales del aviso de ancho: cambiar de rol o de proyecto (ambas
    // pueden llevar a un panel que sí funciona en móvil). Se nombra solo la que
    // el usuario efectivamente tiene, para no mandarlo a buscar un control que
    // en su caso no está en el menú.
    const narrowEscapeHint = hasMultipleRoles && hasMultipleProjects
        ? ' Si vas a seguir desde acá, cambiá de rol o de proyecto en el menú de arriba.'
        : hasMultipleRoles
            ? ' Si vas a seguir desde acá, cambiá de rol en el menú de arriba.'
            : hasMultipleProjects
                ? ' Si vas a seguir desde acá, cambiá de proyecto en el menú de arriba.'
                : '';

    const menuItems: { id: AdminView; label: string }[] = [
        { id: 'analysis', label: 'Análisis' },
        { id: 'periods', label: 'Períodos' },
        { id: 'records', label: 'Registros' },
        { id: 'variables', label: 'Variables' },
        { id: 'observation-units', label: 'Unidades de Observación' },
        { id: 'users', label: 'Miembros' },
    ];

    if (!isWideEnough) {
        return (
            // Sin card: acá no hay panel que enmarcar todavía, así que el aviso
            // se lee directo contra el fondo -- mismo trato que la pantalla de
            // login, que también es texto desnudo sobre --color-bg.
            <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
                <h2 className="text-base sm:text-lg font-medium text-ink">Se necesita más ancho</h2>
                <p className="text-sm text-ink/70 max-w-md">
                    El panel de administración está pensado para pantallas anchas y no se
                    adapta a este tamaño. Probá desde una pantalla más grande o girá el
                    dispositivo.
                    {narrowEscapeHint}
                </p>
            </div>
        );
    }

    // Fase U garantiza que activeProjectId ya está resuelto para cuando
    // AdminDashboard llega a renderizar (ProjectRoleBridge gatea en isLoading
    // y en availableProjects vacío antes de montar este árbol) -- este check
    // es solo el boundary de tipos entre ProjectContext (number | null) y los
    // managers de acá abajo (que reciben projectId: number sin nullability).
    if (activeProjectId === null) {
        return null;
    }

    return (
        // Un solo nivel de superficie (la card madre del contenido); el sidebar
        // queda sin card, flotando sobre --color-bg. Ver .admin-surface en
        // nocturne.css. Sin drawer ni hamburguesa: el gate de ancho de arriba
        // garantiza >=1024px, donde el sidebar siempre entra fijo.
        <div className="flex gap-5">
            <aside className="w-64 shrink-0 pt-1">
                <h1 className="text-xl font-medium text-ink px-2 mb-6">Administración</h1>
                <nav className="space-y-1">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-full flex items-center px-3 py-2.5 rounded-[var(--nc-radius-md)] text-left text-sm font-medium transition-colors ${
                                view === item.id
                                    ? 'bg-accent-800 text-accent-100'
                                    : 'text-ink/80 hover:bg-nc-neutral-500/10'
                            }`}
                        >
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Fuera del <nav>: no es un destino de navegación -- no
                    participa del estado `view` ni toma el resaltado activo,
                    abre un overlay y devuelve al panel donde estabas. Lo que lo
                    separa de los ítems del menú es la forma: botón con borde y
                    fondo transparente (.btn-secondary), igual que "Modo
                    Plataforma" en el header, en vez de un ítem de lista. */}
                <div className="mt-4">
                    <button
                        onClick={() => setPresentacionAbierta(true)}
                        className="btn btn-secondary w-full px-3 py-2.5"
                    >
                        <span>Presentación</span>
                    </button>
                </div>
            </aside>

            {/* min-w-0 para que las tablas anchas scrolleen en su propio wrapper
                (cada una trae su overflow-x-auto) en vez de estirar el flex row */}
            <main className="flex-grow min-w-0">
                <div className="admin-surface p-5">
                    {view === 'analysis' && <AnalysisView projectId={activeProjectId} />}
                    {view === 'periods' && <PeriodsManager projectId={activeProjectId} />}
                    {view === 'records' && <ObservationsManager projectId={activeProjectId} />}
                    {view === 'variables' && <VariablesManager projectId={activeProjectId} />}
                    {view === 'observation-units' && <ObservationUnitsManager projectId={activeProjectId} />}
                    {view === 'users' && <MembersManager projectId={activeProjectId} />}
                </div>
            </main>

            {presentacionAbierta && (
                <PresentacionOverlay onClose={() => setPresentacionAbierta(false)} />
            )}
        </div>
    );
}

export default AdminDashboard;
