import { useState, useEffect, useMemo, lazy, Suspense, memo } from 'react';
import { RadioTower } from 'lucide-react';
import LoadingOverlay from './LoadingOverlay';
import { DashboardSkeleton } from './Skeleton';
import PeriodDropdown, { type PeriodOption } from './student/PeriodDropdown';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { apiFetch } from '../api';
import { useProject } from '../contexts/ProjectContext';
import { LOADING_FADE_MS, useDelayedLoading } from '../hooks/useDelayedLoading';
import { useToast } from './Toast';
import type {
    AuthUser,
    NumericVariableConfig,
    ObservationValueMap,
    StudentDashboardPeriod,
    StudentTasksResponse,
    StudentTaskStatus,
    StudyField,
    Variable,
    ValueEntryPayload,
} from '../types/api';

// `false` (booleano) es una respuesta válida, no la ausencia de una.
const hasValidValue = (value: unknown): value is number | string | boolean => value != null && value !== '';

function formatValuePreview(variable: Variable, value: unknown): string {
    if (!hasValidValue(value)) return 'N/A';
    switch (variable.dataType) {
        case 'numeric': {
            const isCurrency = !!(variable.config as NumericVariableConfig | null)?.isCurrency;
            const num = Number(value);
            return isCurrency ? new Intl.NumberFormat('es-PY').format(num) : new Intl.NumberFormat('es-PY').format(num);
        }
        case 'boolean':
            return value ? 'Sí' : 'No';
        default:
            return String(value);
    }
}

// Espeja a la del wizard: una variable no disponible viaja con valor null +
// la marca, nunca con las dos cosas.
function toValueEntries(values: ObservationValueMap, unavailableIds: number[]): ValueEntryPayload[] {
    const unavailable = new Set(unavailableIds);
    const entries: ValueEntryPayload[] = Object.entries(values)
        .filter(([variableId, value]) => hasValidValue(value) && !unavailable.has(Number(variableId)))
        .map(([variableId, value]) => ({ variableId: Number(variableId), value }));

    unavailable.forEach(variableId => {
        entries.push({ variableId, value: null, isUnavailable: true });
    });

    return entries;
}

// Lazy load RegistrationWizard con recarga automática si el chunk cambió tras un deploy
const RegistrationWizard = lazy(() =>
    import('./RegistrationWizard').catch((err) => {
        window.location.reload();
        throw err;
    })
);

/*
 * Los dos estados vacíos del panel son texto y nada más: sin ícono, sin caja
 * y sin borde. Un estado vacío no es contenido -- si se lo encierra en una
 * tarjeta con un ícono grande, termina pesando más que la pantalla llena que
 * reemplaza. Ambas líneas van en el gris secundario; la jerarquía entre
 * titular y detalle la marca el tamaño, no el color.
 */
const NoCollectionPanel = memo(() => (
    <div className="py-12 text-center">
        <p className="text-muted text-sm">¡Todo listo por aquí!</p>
        <p className="text-muted mx-auto mt-1 max-w-md text-xs">
            No hay recolecciones disponibles para ti en este momento, ¡nos vemos pronto!
        </p>
    </div>
));
NoCollectionPanel.displayName = 'NoCollectionPanel';

/*
 * El período existe pero no tiene ninguna tarea. Es un estado real y
 * frecuente, no un borde: getStudentDashboard devuelve un item por CADA
 * período del proyecto, y arma las tareas desde las asignaciones del
 * estudiante -- con cero unidades asignadas quedaban un título, el selector y
 * una línea horizontal sobre el vacío, sin una sola palabra que explicara
 * qué había pasado.
 */
const NoTasksPanel = memo(({ periodName }: { periodName: string }) => (
    <div className="py-12 text-center">
        <p className="text-muted text-sm">Nada por el momento</p>
        <p className="text-muted mx-auto mt-1 max-w-md text-xs">
            No tenés unidades de observación asignadas para {periodName}. Cuando tu coordinador
            te asigne alguna, va a aparecer acá.
        </p>
    </div>
));
NoTasksPanel.displayName = 'NoTasksPanel';

// Color del anillo según status -- verde=completado, accent=en_proceso,
// gris=pendiente, igual esquema que el mockup (dashboard, task ring).
function ringColorForStatus(status: string): string {
    if (status === 'Completado') return 'var(--color-success)';
    if (status === 'En Proceso') return 'var(--color-accent)';
    return 'var(--color-nc-neutral-700)';
}

const CircularProgress = memo(({ percentage, status }: { percentage: number; status: string }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const color = ringColorForStatus(status);

    return (
        <div className="relative h-12 w-12 flex-shrink-0">
            <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
                <circle cx="24" cy="24" r={radius} strokeWidth="4" fill="transparent" stroke="var(--color-nc-neutral-800)" />
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    strokeWidth="4"
                    fill="transparent"
                    stroke={color}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
            </svg>
            {/* 10px y no text-xs: el hueco del anillo mide 32px de diámetro
                (r=18 menos los 4 de trazo) y "100%" en bold a 12px lo desborda
                -- el caso lleno es el que fija el tamaño de fuente acá. */}
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink">
                {`${Math.round(percentage)}%`}
            </span>
        </div>
    );
});
CircularProgress.displayName = 'CircularProgress';

interface RegistrationSummaryProps {
    variables: Variable[];
    studyFields: StudyField[];
    values: ObservationValueMap;
    unavailableIds: Set<number>;
    title: string;
}

// Un solo nivel de superficie más (la tarjeta de la tarea, en el padre) ya
// cubierto -- esto es texto plano y filas separadas por líneas, sin fondos
// tintados por fila (ver diagnóstico "de cajas a diseño integral").
const RegistrationSummary = ({ variables, studyFields, values, unavailableIds, title }: RegistrationSummaryProps) => {
    const summaryData = useMemo(() => {
        return studyFields.map(field => {
            const fieldVariables = variables.filter(v => v.studyFieldId === field.id);
            // Una variable no disponible está relevada: cuenta para el
            // contador del campo aunque no tenga valor que mostrar.
            const completedCount = fieldVariables.filter(
                v => hasValidValue(values[v.id]) || unavailableIds.has(v.id)
            ).length;
            const percentage = fieldVariables.length > 0 ? (completedCount / fieldVariables.length) * 100 : 0;
            return { ...field, variables: fieldVariables, completedCount, percentage };
        });
    }, [studyFields, variables, values, unavailableIds]);

    return (
        <div className="pt-3 mt-1" style={{ borderTop: '1px solid var(--color-divider)' }}>
            <h4 className="a-eyebrow text-[11px] uppercase tracking-wide text-accent-300 mb-2 px-1">{title}</h4>
            <Accordion type="single" collapsible className="gap-0">
                {summaryData.map(field => {
                    const isComplete = field.completedCount === field.variables.length && field.variables.length > 0;

                    return (
                        <AccordionItem key={field.id} value={String(field.id)}>
                            <AccordionTrigger className="px-1 py-2.5 hover:text-accent-300">
                                <span className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm font-medium text-ink truncate">{field.name}</span>
                                </span>
                                <span className={`tag flex-shrink-0 ${isComplete ? 'tag-accent' : 'tag-neutral'}`}>
                                    {field.completedCount} / {field.variables.length}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="pb-2">
                                    {field.variables.map((v, i) => {
                                        const isUnavailable = unavailableIds.has(v.id);
                                        const hasValue = !isUnavailable && hasValidValue(values[v.id]);
                                        return (
                                            <li
                                                key={v.id}
                                                className="flex justify-between items-center gap-2 py-2 px-1 text-sm"
                                                style={i > 0 ? { borderTop: '1px solid var(--color-divider)' } : undefined}
                                            >
                                                <span className={hasValue || isUnavailable ? 'text-ink truncate' : 'text-muted truncate'}>{v.name}</span>
                                                {/* "No disponible" no va en cifras tabulares ni en el color
                                                    de valor: no es una lectura, es la ausencia declarada de
                                                    una, y leerla como un dato más invita a compararla
                                                    con los números de al lado. */}
                                                {isUnavailable ? (
                                                    <span className="flex-shrink-0 text-muted italic">No disponible</span>
                                                ) : (
                                                    <span className={`tabular-nums flex-shrink-0 ${hasValue ? 'text-accent-300' : 'text-muted'}`}>
                                                        {formatValuePreview(v, values[v.id])}
                                                    </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
};

interface EditingObservationUnit {
    id: number;
    name: string;
    initialDraft: ObservationValueMap;
    initialUnavailable: number[];
}

function StudentDashboard({ user: _user }: { user: AuthUser }) {
    const { activeProjectId } = useProject();
    const toast = useToast();
    const [dashboardData, setDashboardData] = useState<StudentDashboardPeriod[]>([]);
    const [staticData, setStaticData] = useState<StudentTasksResponse>({ variables: [], studyFields: [], assignedObservationUnits: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption | null>(null);
    const [editingObservationUnit, setEditingObservationUnit] = useState<EditingObservationUnit | null>(null);
    // '' (y no undefined) para el estado "ninguno abierto": con undefined Radix
    // trata al Accordion como no controlado y warnea al recibir un value real.
    const [openTaskId, setOpenTaskId] = useState('');
    // El skeleton solo se monta si la carga pasa de la ventana de gracia, y
    // una vez montado se queda un mínimo: ver useDelayedLoading.
    const showSkeleton = useDelayedLoading(isLoading);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [periodsData, staticInfo] = await Promise.all([
                    apiFetch<StudentDashboardPeriod[]>(`/api/student/dashboard?projectId=${activeProjectId}`),
                    apiFetch<StudentTasksResponse>(`/api/student-tasks?projectId=${activeProjectId}`)
                ]);
                setDashboardData(periodsData);
                setStaticData(staticInfo);
                const openPeriod = periodsData.find(p => p.status === 'Open');
                if (openPeriod) {
                    setSelectedPeriod({ value: openPeriod.periodId, label: openPeriod.periodName, status: openPeriod.status });
                } else if (periodsData.length > 0) {
                    const firstPeriod = periodsData[0];
                    setSelectedPeriod({ value: firstPeriod.periodId, label: firstPeriod.periodName, status: firstPeriod.status });
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al cargar los datos');
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [activeProjectId]);

    const handleCloseWizard = async (draftData: ObservationValueMap, unavailableIds: number[]) => {
        if (editingObservationUnit) {
            setIsSaving(true);
            try {
                await apiFetch('/api/draft-observations', {
                    method: 'POST',
                    body: JSON.stringify({ observationUnitId: editingObservationUnit.id, values: toValueEntries(draftData, unavailableIds) }),
                    skipAuthRedirect: true,
                });
                const newData = await apiFetch<StudentDashboardPeriod[]>(`/api/student/dashboard?projectId=${activeProjectId}`, { skipAuthRedirect: true });
                setDashboardData(newData);
                toast.success('Borrador guardado exitosamente');
            } catch {
                // Si la sesión expiró o el período cerró, el borrador ya está en localStorage
                toast.info('Borrador guardado localmente');
            } finally {
                setIsSaving(false);
            }
        }
        setEditingObservationUnit(null);
    };

    const handleSubmissionSuccess = async () => {
        setEditingObservationUnit(null);
        setIsSaving(true);
        try {
            const newData = await apiFetch<StudentDashboardPeriod[]>(`/api/student/dashboard?projectId=${activeProjectId}`);
            setDashboardData(newData);
            toast.success('¡Registro enviado exitosamente!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al actualizar los datos');
        } finally {
            setIsSaving(false);
        }
    };

    const periodOptions = useMemo<PeriodOption[]>(() => dashboardData.map(p => ({ value: p.periodId, label: p.periodName, status: p.status })), [dashboardData]);
    const activePeriodData = useMemo(() => selectedPeriod ? dashboardData.find(p => p.periodId === selectedPeriod.value) : null, [selectedPeriod, dashboardData]);
    const openPeriod = useMemo(() => dashboardData.find(p => p.status === 'Open'), [dashboardData]);
    const goToActivePeriod = () => { if (openPeriod) setSelectedPeriod({ value: openPeriod.periodId, label: openPeriod.periodName, status: openPeriod.status }); };

    if (activeProjectId === null) return null;
    // Durante la ventana de gracia el skeleton se monta igual pero invisible:
    // devolver null dejaba la pantalla vacía un cuarto de segundo y después la
    // llenaba de golpe. Acá el panel entero se reemplaza (no es un área dentro
    // de un contenedor), así que no hay alto que animar -- alcanza con no
    // pasar nunca por el vacío.
    if (isLoading || showSkeleton) {
        return (
            <div style={{ opacity: showSkeleton ? 1 : 0, transition: `opacity ${LOADING_FADE_MS}ms ease` }}>
                <DashboardSkeleton />
            </div>
        );
    }
    if (error) return <div className="text-center p-8 text-danger">{error}</div>;
    if (dashboardData.length === 0) return <NoCollectionPanel />;

    return (
        <>
            <div className="animate-fade-in">
                {/* El selector de período dejó de ser un campo ancho: es un
                    control secundario, así que va como botón chico arriba a la
                    derecha, en la misma línea del título. */}
                <div className="flex items-start justify-between gap-3 mb-6">
                    <h2 className="text-2xl sm:text-3xl font-medium text-ink">Tus Tareas</h2>
                    <div className="flex items-start gap-2 flex-shrink-0">
                        {openPeriod && selectedPeriod?.value !== openPeriod.periodId && (
                            <button
                                onClick={goToActivePeriod}
                                // En móvil queda solo el ícono: el texto no
                                // entra al lado del selector sin empujar el
                                // título, de ahí aria-label/title.
                                aria-label="Ir al período activo"
                                title="Ir al período activo"
                                className="btn btn-primary rounded-full px-3 py-1.5 whitespace-nowrap animate-pulse"
                            >
                                <RadioTower size={16} className="animate-bounce" />
                                <span className="hidden sm:inline">Ir al período activo</span>
                            </button>
                        )}
                        <PeriodDropdown
                            options={periodOptions}
                            value={selectedPeriod}
                            onChange={setSelectedPeriod}
                        />
                    </div>
                </div>

                {activePeriodData && activePeriodData.tasks.length === 0 && (
                    <>
                        <hr className="hr" />
                        <NoTasksPanel periodName={activePeriodData.periodName} />
                    </>
                )}

                {activePeriodData && activePeriodData.tasks.length > 0 && (
                    <>
                        <hr className="hr" />
                        <Accordion
                            type="single"
                            collapsible
                            className="gap-3 mt-3"
                            value={openTaskId}
                            onValueChange={setOpenTaskId}
                        >
                            {activePeriodData.tasks.map((task, index) => {
                                let values: ObservationValueMap = task.status === 'Completado' ? task.submittedValues : task.draftValues;
                                // Fusionar borradores de localStorage si tienen más progreso que el backend
                                if (task.status !== 'Completado') {
                                    try {
                                        const localDraft: ObservationValueMap = JSON.parse(localStorage.getItem(`draft_${task.observationUnitId}`) || '{}');
                                        const localCount = Object.values(localDraft).filter(hasValidValue).length;
                                        const serverCount = Object.values(values).filter(hasValidValue).length;
                                        if (localCount > serverCount) values = localDraft;
                                    } catch { /* ignorar errores de parse */ }
                                }
                                // Una variable marcada "no disponible" es trabajo hecho: el
                                // estudiante fue, miró y no había nada que observar. Cuenta
                                // para el progreso aunque no tenga valor. Quien quiere ver
                                // cuánto DATO trajo cada uno lo ve en el panel de monitor,
                                // que las descuenta al calcular la completitud.
                                const unavailableIds = new Set(task.unavailableVariableIds);
                                const completedCount = Object.entries(values)
                                    .filter(([variableId, value]) => hasValidValue(value) && !unavailableIds.has(Number(variableId)))
                                    .length + unavailableIds.size;
                                const totalCount = staticData.variables.length;
                                const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                                const itemValue = String(task.observationUnitId);

                                // El status del backend solo mira los borradores que llegaron al
                                // servidor, pero `values` ya viene fusionado con el de
                                // localStorage -- que puede tener más progreso, porque el wizard
                                // escribe local en cada tecla y recién sincroniza al cerrarse. Si
                                // esa sincronización nunca ocurrió (se cerró la pestaña a mitad,
                                // o el POST falló y quedó en "Borrador guardado localmente"), la
                                // tarjeta mostraba anillo y contador a medias pero el pill en
                                // "Pendiente" y el botón en "Iniciar Registro". Todo lo que se ve
                                // acá cuelga de este status derivado para que no se contradigan.
                                const effectiveStatus: StudentTaskStatus =
                                    task.status !== 'Pendiente'
                                        ? task.status
                                        : completedCount > 0 ? 'En Proceso' : 'Pendiente';

                                const ActionButton = () => {
                                    if (activePeriodData.status !== 'Open') return null;
                                    if (effectiveStatus === 'Completado') {
                                        return <button disabled className="btn btn-secondary btn-block mb-1">Registro Enviado</button>;
                                    }
                                    return <button onClick={() => setEditingObservationUnit({ id: task.observationUnitId, name: task.observationUnitName, initialDraft: task.draftValues, initialUnavailable: task.unavailableVariableIds })} className="btn btn-primary btn-block mb-1">{effectiveStatus === 'En Proceso' ? 'Continuar Registro' : 'Iniciar Registro'}</button>;
                                };

                                return (
                                    <AccordionItem
                                        key={task.observationUnitId}
                                        value={itemValue}
                                        className={`card card-flat p-3 animate-fade-in ${openTaskId === itemValue ? 'border-accent/40' : ''}`}
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <AccordionTrigger
                                            aria-label={`${task.observationUnitName} - ${effectiveStatus} - ${completedCount} de ${totalCount} variables registradas`}
                                        >
                                            <span className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                                <CircularProgress percentage={percentage} status={effectiveStatus} />
                                                <span className="min-w-0 flex-1 text-left">
                                                    <span className="card-title text-base sm:text-lg truncate block">{task.observationUnitName}</span>
                                                    <span className={`tag mt-1 ${effectiveStatus === 'Completado' ? 'tag-accent' : effectiveStatus === 'En Proceso' ? 'tag-outline' : 'tag-neutral'}`}>
                                                        {effectiveStatus === 'Completado' ? 'Completado' : effectiveStatus === 'En Proceso' ? 'En proceso' : 'Pendiente'}
                                                    </span>
                                                    <span className="text-muted text-xs sm:text-sm mt-1 block">{completedCount} / {totalCount} variables</span>
                                                </span>
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <ActionButton />
                                            <RegistrationSummary
                                                variables={staticData.variables}
                                                studyFields={staticData.studyFields}
                                                values={values}
                                                unavailableIds={unavailableIds}
                                                title={task.status === 'Completado' ? 'Valores Enviados' : 'Progreso de Registro'}
                                            />
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </>
                )}
            </div>

            {editingObservationUnit && (
                <Suspense fallback={<LoadingOverlay message="Cargando formulario..." />}>
                    <RegistrationWizard
                        observationUnit={editingObservationUnit}
                        variables={staticData.variables}
                        studyFields={staticData.studyFields}
                        initialDraft={editingObservationUnit.initialDraft}
                        initialUnavailable={editingObservationUnit.initialUnavailable}
                        onClose={handleCloseWizard}
                        onSubmitSuccess={handleSubmissionSuccess}
                    />
                </Suspense>
            )}

            {isSaving && <LoadingOverlay message="Guardando cambios..." />}
        </>
    );
}

export default StudentDashboard;
