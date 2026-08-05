import { useState, useMemo } from 'react';
import { LogOut, User, Menu, ChevronDown, Check } from 'lucide-react';
import StudentDashboard from '../components/StudentDashboard';
import MonitorDashboard from '../components/MonitorDashboard';
import AdminDashboard from '../components/AdminDashboard';
import PlatformDashboard from '../components/PlatformDashboard';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { RoleProvider, useRole } from '../contexts/RoleContext';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useScrolledPast } from '../hooks/useScrolledPast';
import type { AuthUser } from '../types/api';

interface RoleConfigEntry {
    label: string;
}

// Configuración de roles. Ni el pill del header ni los ítems del menú llevan
// ícono ni color propio: el rol se identifica por su nombre y nada más.
const roleConfig: Record<string, RoleConfigEntry> = {
    admin: { label: 'Administrador' },
    monitor: { label: 'Monitor' },
    student: { label: 'Estudiante' },
};

// Marca del rol activo dentro del dropdown. Es una sola, igual para los tres:
// como solo puede haber un rol activo a la vez, el resaltado dice "este es el
// que estás usando" y nada más -- un color por rol no agregaba información y
// obligaba a estirar la paleta. Achromático a propósito: en Nocturne el verde
// (--color-success) está reservado para significado (ok/error, subió/bajó), así
// que teñir "Estudiante" de verde lo hacía leer como un estado y no como una
// selección.
const ROLE_ACTIVE_CLASS = 'bg-accent/20 text-accent font-semibold';

// Pill de rol: transparente, sin ícono, texto en el color de letra base.
// El único adorno es el borde (--color-divider = ink al 16%) para que se siga
// leyendo como pill, y el chevron cuando es clickeable.
const ROLE_PILL_CLASS =
    'mt-2 text-sm font-semibold text-ink px-3 py-1 rounded-full inline-flex items-center gap-2 border border-divider bg-transparent';

// Debajo de este ancho el cluster derecho del header (selector de proyecto +
// Modo Plataforma + perfil) ya no entra al lado del nombre: el pill de rol,
// que vive debajo del nombre y no encoge, se desborda de su columna y termina
// pisando los botones. Ahí los tres controles se colapsan en un único botón
// hamburguesa, que además deja todo el ancho restante para nombre y rol.
const HEADER_WIDE_QUERY = '(min-width: 768px)';

// Todos los dropdowns del header van con modal={false}. Con el modal por
// defecto, Radix le pone aria-hidden a #root mientras el trigger -- que vive
// adentro de #root -- todavía tiene el foco, y Chrome lo reporta como error de
// accesibilidad ("Blocked aria-hidden on an element because its descendant
// retained focus"). Sin modal no hay aria-hidden sobre el resto de la página ni
// bloqueo de scroll; el cierre por click afuera y por Escape lo sigue
// manejando el dismissable layer, así que no se pierde comportamiento.

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

    // Acordeón de proyectos del menú hamburguesa. Contraído por defecto: en el
    // menú móvil la lista completa es la sección más larga de lejos, y con
    // muchos proyectos empuja "Modo Plataforma" y "Cerrar Sesión" fuera de la
    // vista (el menú scrollea, pero nada indica que haya algo más abajo).
    const [isProjectListOpen, setIsProjectListOpen] = useState(false);

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

    // El panel admin es sidebar + tablas anchas: se le da más ancho útil que al
    // resto de los roles (student/monitor son lecturas angostas y a 1800px
    // quedarían con líneas larguísimas).
    const isAdminView = !isPlatformMode && activeRole === 'admin';

    // Qué controles existen en este contexto. Se calcula una sola vez porque el
    // header los dibuja en dos formas distintas (botones sueltos en escritorio,
    // ítems del menú hamburguesa en móvil) y las condiciones tienen que ser
    // exactamente las mismas en ambas.
    //
    // El header ya no se poda cuando el rol activo es admin en pantalla angosta
    // (AdminDashboard muestra ahí su aviso de "se necesita más ancho"). Esa poda
    // existía para evitar el choque visual de tres controles al lado del nombre,
    // y el hamburguesa lo resuelve de raíz: adentro del menú no compiten por
    // ancho con nada. Sin ella, además, desaparece un callejón sin salida --
    // un superadmin con un solo rol en el proyecto activo se quedaba sin
    // selector de proyecto Y sin cambio de rol, o sea sin ninguna forma de
    // salir del aviso salvo ensanchar la ventana.
    const isWideHeader = useMediaQuery(HEADER_WIDE_QUERY);

    // Divisor del header: aparece sólo cuando hay contenido pasando por debajo
    // (ver useScrolledPast y .nc-header en nocturne.css).
    const { sentinelRef, hasScrolledPast } = useScrolledPast<HTMLDivElement>();
    const showProjectSwitcher = !isPlatformMode && hasMultipleProjects && activeProject !== null;
    const showPlatformToggle = isSuperadmin;
    const platformToggleLabel = isPlatformMode ? 'Volver a mi Proyecto' : 'Modo Plataforma';

    // Lista de proyectos, compartida entre el dropdown propio de escritorio y
    // el acordeón de proyectos dentro del hamburguesa (que la indenta para que
    // se lea como contenido del acordeón y no como ítems sueltos del menú).
    const renderProjectItems = (extraClassName = '') =>
        availableProjects.map((project) => {
            const isActive = project.projectId === activeProjectId;
            return (
                <DropdownMenuItem
                    key={project.projectId}
                    onSelect={() => switchProject(project.projectId)}
                    className={`py-2.5 ${extraClassName} ${isActive ? 'text-ink font-semibold' : 'text-ink/80'}`}
                >
                    <span className="flex-1 truncate">{project.projectName}</span>
                    {isActive && <Check size={18} className="text-accent" />}
                </DropdownMenuItem>
            );
        });

    return (
        <div className="min-h-screen w-full text-ink font-sans" style={{ background: 'var(--color-bg)' }}>
            <div className={`${isAdminView ? 'max-w-[1800px]' : 'max-w-screen-2xl'} mx-auto px-4 pb-4`}>
                {/* Centinela del divisor. Va ARRIBA del header y necesita alto
                    propio para que el observer lo vea; -mb-px se lo devuelve al
                    layout para que no corra todo un pixel hacia abajo. */}
                <div ref={sentinelRef} aria-hidden="true" className="h-px -mb-px" />

                {/* El padding vertical era del contenedor (p-4) y pasa acá: al
                    quedar pegado arriba, el aire por encima del nombre tiene
                    que ser parte de la barra, no del documento que scrollea.
                    Los márgenes de abajo bajan en la misma medida para que el
                    hueco hasta el panel siga siendo el de antes (24/32px).
                    z-30: debajo de dropdowns y overlays (z-50) y del drawer de
                    PlatformDashboard (z-40/50), que tienen que taparlo. */}
                <header
                    data-stuck={hasScrolledPast}
                    className="nc-header sticky top-0 z-30 flex justify-between items-center py-4 mb-2 sm:mb-4 gap-4"
                >
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg sm:text-xl md:text-2xl font-medium truncate">{user.name}</h1>

                        {isPlatformMode && (
                            <span className="mt-2 inline-flex items-center text-sm font-semibold bg-nc-neutral-500/20 text-nc-neutral-300 px-3 py-1 rounded-full border border-nc-neutral-400/30">
                                Modo Plataforma
                            </span>
                        )}

                        {/* Badge de Rol con Dropdown Integrado */}
                        {!isPlatformMode && currentRoleConfig && (
                            hasMultipleRoles ? (
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <button className={`group/trigger ${ROLE_PILL_CLASS} hover:bg-ink/10 transition-all cursor-pointer`}>
                                            <span>{currentRoleConfig.label}</span>
                                            {availableRoles.length > 1 && (
                                                <span className="text-xs font-medium text-muted">
                                                    +{availableRoles.length - 1}
                                                </span>
                                            )}
                                            <ChevronDown size={14} className="transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56">
                                        <DropdownMenuLabel className="text-muted">
                                            Cambiar rol activo
                                        </DropdownMenuLabel>
                                        {availableRoles.map((role) => {
                                            const config = roleConfig[role];
                                            // Una membership podría traer un rol que no está en roleConfig
                                            // (dato viejo/seed): se omite en vez de romper el header entero.
                                            if (!config) return null;
                                            const isActive = role === activeRole;
                                            return (
                                                <DropdownMenuItem
                                                    key={role}
                                                    onSelect={() => switchRole(role)}
                                                    className={`py-2.5 px-2.5 ${isActive ? ROLE_ACTIVE_CLASS : 'text-ink/80'}`}
                                                >
                                                    <span className="flex-1">{config.label}</span>
                                                    {isActive && <Check size={18} className="text-accent" />}
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
                                <span className={ROLE_PILL_CLASS}>
                                    {currentRoleConfig.label}
                                </span>
                            )
                        )}
                    </div>

                    {isWideHeader ? (
                        <>
                            {/* Selector de Proyecto -- solo visible si el usuario pertenece a
                                más de uno y no está en Modo Plataforma (que es
                                project-agnostic). Vive en el cluster derecho, pegado al
                                toggle de Modo Plataforma y con su mismo botón: son las dos
                                acciones de "en qué contexto estoy trabajando", así que
                                comparten forma en vez de que una sea pill y la otra botón.
                                Sin ícono, igual que el pill de rol. */}
                            {showProjectSwitcher && (
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <button className="group/trigger btn btn-secondary rounded-full px-4 py-3 flex-shrink-0">
                                            <span className="truncate max-w-[12rem]">{activeProject.projectName}</span>
                                            <ChevronDown size={14} className="transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64">
                                        <DropdownMenuLabel className="text-muted">
                                            Cambiar proyecto activo
                                        </DropdownMenuLabel>
                                        {renderProjectItems()}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Toggle Modo Plataforma -- solo visible para superadmin */}
                            {showPlatformToggle && (
                                <button
                                    onClick={() => setIsPlatformMode(prev => !prev)}
                                    className="btn btn-secondary rounded-full px-4 py-3 flex-shrink-0"
                                >
                                    {/* El texto no puede esconderse: sin ícono, el
                                        botón quedaría vacío */}
                                    <span>{platformToggleLabel}</span>
                                </button>
                            )}

                            {/* Menú dropdown en icono de perfil */}
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="btn btn-icon btn-secondary rounded-full !w-auto !h-auto p-3 flex-shrink-0"
                                        aria-label="Menú de usuario"
                                    >
                                        <User size={24} />
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
                        </>
                    ) : (
                        /* Móvil: un solo botón hamburguesa con todo el cluster
                           derecho adentro, en el mismo orden que en escritorio
                           (proyecto, Modo Plataforma, perfil). */
                        <DropdownMenu
                            modal={false}
                            // Cada apertura arranca con el acordeón de proyectos
                            // contraído. Se resetea al abrir y no al cerrar para no
                            // mostrar el colapso durante la animación de salida.
                            onOpenChange={(open) => { if (open) setIsProjectListOpen(false); }}
                        >
                            <DropdownMenuTrigger asChild>
                                <button
                                    // border-transparent: en reposo el ícono va suelto sobre el
                                    // fondo, sin la caja de .btn-secondary. El borde sigue
                                    // reservando su 1px, así que no salta al pasar el mouse; el
                                    // hover/active del secondary (fondo tenue) queda como feedback.
                                    className="btn btn-icon btn-secondary border-transparent rounded-full !w-auto !h-auto p-2.5 flex-shrink-0"
                                    aria-label="Menú"
                                >
                                    <Menu size={20} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel className="text-ink truncate">{user.name}</DropdownMenuLabel>

                                {showProjectSwitcher && (
                                    <>
                                        <DropdownMenuSeparator />
                                        {/* Cabecera del acordeón: muestra el proyecto
                                            activo (que es la información que importa
                                            con la lista contraída) y despliega el
                                            resto. preventDefault en onSelect para que
                                            el menú no se cierre al abrirlo -- va en
                                            onSelect y no en onClick para que también
                                            funcione con Enter/Espacio. */}
                                        <DropdownMenuItem
                                            onSelect={(e) => { e.preventDefault(); setIsProjectListOpen(prev => !prev); }}
                                            className="py-2.5 text-ink/80"
                                            aria-expanded={isProjectListOpen}
                                        >
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-xs text-muted">Proyecto activo</span>
                                                <span className="block truncate font-semibold text-ink">{activeProject.projectName}</span>
                                            </span>
                                            <ChevronDown
                                                size={16}
                                                className={`transition-transform duration-200 ${isProjectListOpen ? 'rotate-180' : ''}`}
                                            />
                                        </DropdownMenuItem>
                                        {isProjectListOpen && renderProjectItems('pl-4')}
                                    </>
                                )}

                                {showPlatformToggle && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={() => setIsPlatformMode(prev => !prev)}
                                            className="py-2.5 text-ink/80"
                                        >
                                            <span className="flex-1">{platformToggleLabel}</span>
                                        </DropdownMenuItem>
                                    </>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={onLogout} className="py-2.5 text-ink/80">
                                    <LogOut size={16} />
                                    <span>Cerrar Sesión</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
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
