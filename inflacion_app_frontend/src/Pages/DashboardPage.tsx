import { useState, useMemo, type ComponentType } from 'react';
import { LogOut, User, Shield, UserCog, GraduationCap, FolderKanban, ChevronDown, Check, Building2, ArrowLeftCircle, type LucideIcon } from 'lucide-react';
import StudentDashboard from '../components/StudentDashboard';
import MonitorDashboard from '../components/MonitorDashboard';
import AdminDashboard from '../components/AdminDashboard';
import PlatformDashboard from '../components/PlatformDashboard';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '../components/ui/dropdown-menu';
import { RoleProvider, useRole } from '../contexts/RoleContext';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import type { AuthUser } from '../types/api';

interface RoleConfigEntry {
    label: string;
    icon: LucideIcon;
    bgColor: string;
    textColor: string;
    borderColor: string;
    hoverBg: string;
}

// Configuración de roles -- colores tomados de la paleta Nocturne (accent/
// accent-2/success) en vez de los azules/verdes/púrpuras genéricos de Tailwind,
// para que el badge de rol combine con el resto del shell rediseñado.
const roleConfig: Record<string, RoleConfigEntry> = {
    admin: {
        label: 'Administrador',
        icon: Shield,
        bgColor: 'bg-accent/20',
        textColor: 'text-accent',
        borderColor: 'border-accent/30',
        hoverBg: 'hover:bg-accent/30',
    },
    monitor: {
        label: 'Monitor',
        icon: UserCog,
        bgColor: 'bg-accent-2/20',
        textColor: 'text-accent-2',
        borderColor: 'border-accent-2/30',
        hoverBg: 'hover:bg-accent-2/30',
    },
    student: {
        label: 'Estudiante',
        icon: GraduationCap,
        bgColor: 'bg-success/20',
        textColor: 'text-success',
        borderColor: 'border-success/30',
        hoverBg: 'hover:bg-success/30',
    },
};

interface DashboardContentProps {
    user: AuthUser;
    onLogout: () => void;
}

// Internal component that uses the role context
const DashboardContent = ({ user, onLogout }: DashboardContentProps) => {
    const { activeRole, switchRole, hasMultipleRoles, availableRoles } = useRole();
    const { activeProjectId, switchProject, hasMultipleProjects, availableProjects } = useProject();
    const isSuperadmin = user.roles.includes('superadmin');
    // Arranca directo en Modo Plataforma si el superadmin todavía no tiene
    // ningún proyecto en la plataforma (instalación nueva) -- si no,
    // quedaría viendo "No tienes un rol asignado" sin ninguna forma de
    // llegar a crear el primer proyecto. Lazy initializer: availableProjects
    // ya está resuelto y estable para cuando DashboardContent monta
    // (ProjectRoleBridge gatea en isLoading antes de llegar acá), a
    // diferencia de activeRole (que depende del efecto de RoleProvider, un
    // componente padre cuyo efecto corre DESPUÉS del de este hijo).
    const [isPlatformMode, setIsPlatformMode] = useState(() => isSuperadmin && availableProjects.length === 0);

    const activeProject = useMemo(
        () => availableProjects.find(p => p.projectId === activeProjectId) ?? null,
        [availableProjects, activeProjectId]
    );

    const renderDashboardByRole = () => {
        // Los dashboards ahora son "sin fondo" para flotar sobre el fondo principal
        switch (activeRole) {
            case 'admin':
                return <AdminDashboard user={user} />;
            case 'monitor':
                return <MonitorDashboard user={user} />;
            case 'student':
                return <StudentDashboard user={user} />;
            default:
                return <p className="text-ink">No tienes un rol asignado para ver un panel.</p>;
        }
    };

    const currentRoleConfig = activeRole ? roleConfig[activeRole] : null;
    const RoleIcon: LucideIcon | ComponentType = currentRoleConfig ? currentRoleConfig.icon : User;

    return (
        <div className="min-h-screen w-full text-ink font-sans" style={{ background: 'var(--color-bg)' }}>
            <div className="max-w-screen-2xl mx-auto p-4">
                <header className="flex justify-between items-center mb-6 sm:mb-8 gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg sm:text-xl md:text-2xl font-medium truncate">{user.name}</h1>

                        {isPlatformMode && (
                            <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold bg-nc-neutral-500/20 text-nc-neutral-300 px-3 py-1 rounded-full border border-nc-neutral-400/30">
                                <Building2 size={16} />
                                Modo Plataforma
                            </span>
                        )}

                        {/* Selector de Proyecto -- solo visible si el usuario pertenece a más de uno y no está en Modo Plataforma (que es project-agnostic) */}
                        {!isPlatformMode && hasMultipleProjects && activeProject && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="group/trigger mt-2 text-sm font-semibold bg-nc-neutral-500/20 text-nc-neutral-300 px-3 py-1 rounded-full inline-flex items-center gap-2 border border-nc-neutral-400/30 hover:bg-nc-neutral-500/30 transition-all cursor-pointer">
                                        <FolderKanban size={16} />
                                        <span className="truncate max-w-[10rem]">{activeProject.projectName}</span>
                                        <ChevronDown size={14} className="transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64">
                                    <DropdownMenuLabel className="flex items-center gap-2 text-muted">
                                        <FolderKanban size={14} />
                                        Cambiar proyecto activo
                                    </DropdownMenuLabel>
                                    {availableProjects.map((project) => {
                                        const isActive = project.projectId === activeProjectId;
                                        return (
                                            <DropdownMenuItem
                                                key={project.projectId}
                                                onSelect={() => switchProject(project.projectId)}
                                                className={`py-2.5 ${isActive ? 'text-ink font-semibold' : 'text-ink/80'}`}
                                            >
                                                <span className="p-1.5 rounded-md bg-nc-neutral-500/20 text-nc-neutral-300">
                                                    <FolderKanban size={16} />
                                                </span>
                                                <span className="flex-1 truncate">{project.projectName}</span>
                                                {isActive && <Check size={18} className="text-accent" />}
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Badge de Rol con Dropdown Integrado */}
                        {!isPlatformMode && currentRoleConfig && (
                            hasMultipleRoles ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className={`group/trigger mt-2 text-sm font-semibold ${currentRoleConfig.bgColor} ${currentRoleConfig.textColor} px-3 py-1 rounded-full capitalize inline-flex items-center gap-2 border ${currentRoleConfig.borderColor} ${currentRoleConfig.hoverBg} transition-all cursor-pointer`}>
                                            <RoleIcon size={16} />
                                            <span>{currentRoleConfig.label}</span>
                                            {availableRoles.length > 1 && (
                                                <span className="ml-0.5 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">
                                                    +{availableRoles.length - 1}
                                                </span>
                                            )}
                                            <ChevronDown size={14} className="transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56">
                                        <DropdownMenuLabel className="flex items-center gap-2 text-muted">
                                            <User size={14} />
                                            Cambiar rol activo
                                        </DropdownMenuLabel>
                                        {availableRoles.map((role) => {
                                            const config = roleConfig[role];
                                            const Icon = config.icon;
                                            const isActive = role === activeRole;
                                            return (
                                                <DropdownMenuItem
                                                    key={role}
                                                    onSelect={() => switchRole(role)}
                                                    className={`py-2.5 ${isActive ? `${config.bgColor} ${config.textColor} font-semibold` : 'text-ink/80'}`}
                                                >
                                                    <span className={`p-1.5 rounded-md ${config.bgColor} ${config.textColor}`}>
                                                        <Icon size={16} />
                                                    </span>
                                                    <span className="flex-1">{config.label}</span>
                                                    {isActive && <Check size={18} className={config.textColor} />}
                                                </DropdownMenuItem>
                                            );
                                        })}
                                        <div className="mt-1 border-t px-2 pt-2" style={{ borderColor: 'var(--color-divider)' }}>
                                            <p className="text-xs text-muted px-1 pb-1">
                                                Vista actual: <span className="font-semibold">{currentRoleConfig.label}</span>
                                            </p>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <span className={`mt-2 text-sm font-semibold ${currentRoleConfig.bgColor} ${currentRoleConfig.textColor} px-3 py-1 rounded-full capitalize inline-flex items-center gap-2 border ${currentRoleConfig.borderColor}`}>
                                    <RoleIcon size={16} />
                                    <span>{currentRoleConfig.label}</span>
                                </span>
                            )
                        )}
                    </div>

                    {/* Toggle Modo Plataforma -- solo visible para superadmin */}
                    {isSuperadmin && (
                        <button
                            onClick={() => setIsPlatformMode(prev => !prev)}
                            className="btn btn-secondary rounded-full px-2.5 sm:px-4 py-2.5 sm:py-3 flex-shrink-0"
                        >
                            {isPlatformMode ? <ArrowLeftCircle size={18} /> : <Building2 size={18} />}
                            <span className="hidden sm:inline">{isPlatformMode ? 'Volver a mi Proyecto' : 'Modo Plataforma'}</span>
                        </button>
                    )}

                    {/* Menú dropdown en icono de perfil */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="btn btn-icon btn-secondary rounded-full !w-auto !h-auto p-2.5 sm:p-3 flex-shrink-0"
                                aria-label="Menú de usuario"
                            >
                                <User size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-ink truncate">{user.name}</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={onLogout} className="py-2.5 text-ink/80">
                                <LogOut size={16} />
                                <span>Cerrar Sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                <main>
                    {isPlatformMode ? <PlatformDashboard /> : renderDashboardByRole()}
                </main>
            </div>
        </div>
    );
};

interface DashboardPageProps {
    user: AuthUser;
    onLogout: () => void;
}

// Puente: tras Fase T, user.roles (el JWT) solo puede contener 'superadmin'
// o estar vacío -- los roles reales de trabajo (admin/monitor/student) viven
// en la ProjectMembership del proyecto activo, así que RoleContext pasa a
// derivarse de ahí en vez del JWT. Debe vivir dentro de ProjectProvider para
// poder leer activeProjectId/availableProjects.
const ProjectRoleBridge = ({ user, onLogout }: DashboardPageProps) => {
    const { activeProjectId, availableProjects, isLoading } = useProject();

    if (isLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <p className="text-ink text-lg font-semibold">Cargando proyectos...</p>
            </div>
        );
    }

    // Un superadmin sin proyectos igual necesita llegar a DashboardContent
    // para poder usar el toggle "Modo Plataforma" y crear el primer
    // proyecto -- solo usuarios no-superadmin quedan atrapados en esta
    // pantalla (de verdad no tienen adónde ir sin que un admin los agregue).
    if (availableProjects.length === 0 && !user.roles.includes('superadmin')) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 text-ink text-center p-4" style={{ background: 'var(--color-bg)' }}>
                <p className="text-lg font-semibold">No tenés acceso a ningún proyecto todavía.</p>
                <p className="text-ink/70 max-w-md">Contactá a un administrador para que te asigne a un proyecto de recolección.</p>
                <button
                    onClick={onLogout}
                    className="btn btn-secondary"
                >
                    Cerrar sesión
                </button>
            </div>
        );
    }

    // ProjectsService#findMine devuelve rol 'admin' sintético por cada
    // proyecto para un superadmin, sin necesitar su propia membership.
    const activeMembership = availableProjects.find(p => p.projectId === activeProjectId);
    const roleUser: Pick<AuthUser, 'roles'> = { roles: activeMembership?.roles ?? [] };

    return (
        <RoleProvider user={roleUser}>
            <DashboardContent user={user} onLogout={onLogout} />
        </RoleProvider>
    );
};

// Wrapper component that provides the project + role context
function DashboardPage({ user, onLogout }: DashboardPageProps) {
    return (
        <ProjectProvider>
            <ProjectRoleBridge user={user} onLogout={onLogout} />
        </ProjectProvider>
    );
}

export default DashboardPage;
