import { useState, useRef, useMemo, useEffect, type ComponentType } from 'react';
import { LogOut, User, Shield, UserCog, GraduationCap, FolderKanban, ChevronDown, Check, type LucideIcon } from 'lucide-react';
import StudentDashboard from '../components/StudentDashboard';
import MonitorDashboard from '../components/MonitorDashboard';
import AdminDashboard from '../components/AdminDashboard';
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

// Configuración de roles
const roleConfig: Record<string, RoleConfigEntry> = {
    admin: {
        label: 'Administrador',
        icon: Shield,
        bgColor: 'bg-purple-500/20',
        textColor: 'text-purple-300',
        borderColor: 'border-purple-400/30',
        hoverBg: 'hover:bg-purple-500/30',
    },
    monitor: {
        label: 'Monitor',
        icon: UserCog,
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-300',
        borderColor: 'border-blue-400/30',
        hoverBg: 'hover:bg-blue-500/30',
    },
    student: {
        label: 'Estudiante',
        icon: GraduationCap,
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-300',
        borderColor: 'border-green-400/30',
        hoverBg: 'hover:bg-green-500/30',
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const roleMenuRef = useRef<HTMLDivElement>(null);
    const projectMenuRef = useRef<HTMLDivElement>(null);

    // Cerrar menús cuando se hace click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
                setIsRoleMenuOpen(false);
            }
            if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
                setIsProjectMenuOpen(false);
            }
        };

        if (isMenuOpen || isRoleMenuOpen || isProjectMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen, isRoleMenuOpen, isProjectMenuOpen]);

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
                return <p className="text-white">No tienes un rol asignado para ver un panel.</p>;
        }
    };

    const currentRoleConfig = activeRole ? roleConfig[activeRole] : null;
    const RoleIcon: LucideIcon | ComponentType = currentRoleConfig ? currentRoleConfig.icon : User;

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-blue-900 text-white font-sans">
            <div className="max-w-screen-2xl mx-auto p-4">
                <header className="flex justify-between items-center mb-6 sm:mb-8 gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">{user.name}</h1>

                        {/* Selector de Proyecto -- solo visible si el usuario pertenece a más de uno */}
                        {hasMultipleProjects && activeProject && (
                            <div className="relative mt-2" ref={projectMenuRef}>
                                <button
                                    onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                                    className="text-sm font-semibold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full inline-flex items-center gap-2 border border-indigo-400/30 hover:bg-indigo-500/30 transition-all cursor-pointer"
                                >
                                    <FolderKanban size={16} />
                                    <span className="truncate max-w-[10rem]">{activeProject.projectName}</span>
                                    <ChevronDown
                                        size={14}
                                        className={`transition-transform duration-200 ${isProjectMenuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {isProjectMenuOpen && (
                                    <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] animate-scale-in overflow-hidden">
                                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                                <FolderKanban size={14} />
                                                <span className="font-semibold">Cambiar proyecto activo</span>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            {availableProjects.map((project) => {
                                                const isActive = project.projectId === activeProjectId;

                                                return (
                                                    <button
                                                        key={project.projectId}
                                                        onClick={() => {
                                                            switchProject(project.projectId);
                                                            setIsProjectMenuOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                                            isActive
                                                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-300">
                                                            <FolderKanban size={18} />
                                                        </div>
                                                        <span className="flex-1 text-left truncate">{project.projectName}</span>
                                                        {isActive && (
                                                            <Check size={18} className="text-indigo-600 dark:text-indigo-400" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Badge de Rol con Dropdown Integrado */}
                        {currentRoleConfig && (
                            <div className="relative mt-2" ref={roleMenuRef}>
                                {hasMultipleRoles ? (
                                    <button
                                        onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                                        className={`text-sm font-semibold ${currentRoleConfig.bgColor} ${currentRoleConfig.textColor} px-3 py-1 rounded-full capitalize inline-flex items-center gap-2 border ${currentRoleConfig.borderColor} ${currentRoleConfig.hoverBg} transition-all cursor-pointer`}
                                    >
                                        <RoleIcon size={16} />
                                        <span>{currentRoleConfig.label}</span>
                                        {availableRoles.length > 1 && (
                                            <span className="ml-0.5 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">
                                                +{availableRoles.length - 1}
                                            </span>
                                        )}
                                        <ChevronDown
                                            size={14}
                                            className={`transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                ) : (
                                    <span className={`text-sm font-semibold ${currentRoleConfig.bgColor} ${currentRoleConfig.textColor} px-3 py-1 rounded-full capitalize inline-flex items-center gap-2 border ${currentRoleConfig.borderColor}`}>
                                        <RoleIcon size={16} />
                                        <span>{currentRoleConfig.label}</span>
                                    </span>
                                )}

                                {/* Dropdown de Roles */}
                                {isRoleMenuOpen && hasMultipleRoles && (
                                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] animate-scale-in overflow-hidden">
                                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                                <User size={14} />
                                                <span className="font-semibold">Cambiar rol activo</span>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            {availableRoles.map((role) => {
                                                const config = roleConfig[role];
                                                const Icon = config.icon;
                                                const isActive = role === activeRole;

                                                return (
                                                    <button
                                                        key={role}
                                                        onClick={() => {
                                                            switchRole(role);
                                                            setIsRoleMenuOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                                            isActive
                                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        <div className={`p-1.5 rounded-md ${config.bgColor} ${config.textColor}`}>
                                                            <Icon size={18} />
                                                        </div>
                                                        <span className="flex-1 text-left">{config.label}</span>
                                                        {isActive && (
                                                            <Check size={18} className="text-blue-600 dark:text-blue-400" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                                                Vista actual: <span className="font-semibold">{currentRoleConfig.label}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Menú dropdown en icono de perfil */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="bg-white/10 p-2.5 sm:p-3 rounded-full border border-white/20 hover:bg-white/20 transition-all duration-200 flex-shrink-0"
                            aria-label="Menú de usuario"
                            aria-expanded={isMenuOpen}
                        >
                            <User size={20} className="sm:w-6 sm:h-6" />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden z-[100] animate-scale-in">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        onLogout();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span className="text-sm font-medium">Cerrar Sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main>
                    {renderDashboardByRole()}
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
            <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
                <p className="text-white text-lg font-semibold">Cargando proyectos...</p>
            </div>
        );
    }

    if (availableProjects.length === 0) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-blue-900 flex flex-col items-center justify-center gap-4 text-white text-center p-4">
                <p className="text-lg font-semibold">No tenés acceso a ningún proyecto todavía.</p>
                <p className="text-white/70 max-w-md">Contactá a un administrador para que te asigne a un proyecto de recolección.</p>
                <button
                    onClick={onLogout}
                    className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
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
