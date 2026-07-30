import { useState, useEffect, useMemo, lazy, Suspense, memo } from 'react';
import { Edit3, CheckCircle, Smile, RadioTower } from 'lucide-react';
import LoadingOverlay from './LoadingOverlay';
import { DashboardSkeleton } from './Skeleton';
import PeriodDropdown, { type PeriodOption } from './student/PeriodDropdown';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { apiFetch } from '../api';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from './Toast';
import type {
    AuthUser,
    NumericVariableConfig,
    ObservationValueMap,
    StudentDashboardPeriod,
    StudentTasksResponse,
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

function toValueEntries(values: ObservationValueMap): ValueEntryPayload[] {
    return Object.entries(values)
        .filter(([, value]) => hasValidValue(value))
        .map(([variableId, value]) => ({ variableId: Number(variableId), value }));
}

// Lazy load RegistrationWizard con recarga automática si el chunk cambió tras un deploy
const RegistrationWizard = lazy(() =>
    import('./RegistrationWizard').catch((err) => {
        window.location.reload();
        throw err;
    })
);

const NoCollectionPanel = memo(() => (
    <div className="card elev-sm p-8 text-center">
        <Smile size={64} className="mx-auto text-accent mb-4" />
        <h2 className="text-2xl font-medium mb-2 text-ink">¡Todo listo por aquí!</h2>
        <p className="text-muted">No hay recolecciones disponibles para ti en este momento, ¡nos vemos pronto!</p>
    </div>
));
NoCollectionPanel.displayName = 'NoCollectionPanel';

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
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink">
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
    title: string;
}

// Un solo nivel de superficie más (la tarjeta de la tarea, en el padre) ya
// cubierto -- esto es texto plano y filas separadas por líneas, sin fondos
// tintados por fila (ver diagnóstico "de cajas a diseño integral").
const RegistrationSummary = ({ variables, studyFields, values, title }: RegistrationSummaryProps) => {
    const summaryData = useMemo(() => {
        return studyFields.map(field => {
            const fieldVariables = variables.filter(v => v.studyFieldId === field.id);
            const completedCount = fieldVariables.filter(v => hasValidValue(values[v.id])).length;
            const percentage = fieldVariables.length > 0 ? (completedCount / fieldVariables.length) * 100 : 0;
            return { ...field, variables: fieldVariables, completedCount, percentage };
        });
    }, [studyFields, variables, values]);

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
                                        const hasValue = hasValidValue(values[v.id]);
                                        return (
                                            <li
                                                key={v.id}
                                                className="flex justify-between items-center gap-2 py-2 px-1 text-sm"
                                                style={i > 0 ? { borderTop: '1px solid var(--color-divider)' } : undefined}
                                            >
                                                <span className={hasValue ? 'text-ink truncate' : 'text-muted truncate'}>{v.name}</span>
                                                <span className={`font-mono flex-shrink-0 ${hasValue ? 'text-accent-300' : 'text-muted'}`}>
                                                    {formatValuePreview(v, values[v.id])}
                                                </span>
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
    const [openTaskId, setOpenTaskId] = useState<string | undefined>(undefined);

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

    const handleCloseWizard = async (draftData: ObservationValueMap) => {
        if (editingObservationUnit) {
            setIsSaving(true);
            try {
                await apiFetch('/api/draft-observations', {
                    method: 'POST',
                    body: JSON.stringify({ observationUnitId: editingObservationUnit.id, values: toValueEntries(draftData) }),
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
    if (isLoading) return <DashboardSkeleton />;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (dashboardData.length === 0) return <NoCollectionPanel />;

    return (
        <>
            <div className="animate-fade-in">
                <div className="flex flex-col gap-4 mb-6">
                    <h2 className="text-2xl sm:text-3xl font-medium text-ink">Tus Tareas</h2>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                        {openPeriod && selectedPeriod?.value !== openPeriod.periodId && (
                            <button
                                onClick={goToActivePeriod}
                                className="btn btn-primary order-2 sm:order-1 whitespace-nowrap animate-pulse"
                            >
                                <RadioTower size={16} className="animate-bounce" />
                                <span>Ir al período activo</span>
                            </button>
                        )}
                        <div className="w-full sm:flex-1 md:w-64 md:flex-initial order-1 sm:order-2">
                            <PeriodDropdown
                                options={periodOptions}
                                value={selectedPeriod}
                                onChange={setSelectedPeriod}
                            />
                        </div>
                    </div>
                </div>

                {activePeriodData && (
                    <>
                        <hr className="hr" />
                        <Accordion
                            type="single"
                            collapsible
                            className="gap-3 mt-3"
                            value={openTaskId}
                            onValueChange={(v) => setOpenTaskId(v || undefined)}
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
                                const completedCount = Object.values(values).filter(hasValidValue).length;
                                const totalCount = staticData.variables.length;
                                const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                                const itemValue = String(task.observationUnitId);

                                const ActionButton = () => {
                                    if (activePeriodData.status !== 'Open') return null;
                                    if (task.status === 'Completado') {
                                        return <button disabled className="btn btn-secondary btn-block mb-1"><CheckCircle size={16} /> Registro Enviado</button>;
                                    }
                                    return <button onClick={() => setEditingObservationUnit({ id: task.observationUnitId, name: task.observationUnitName, initialDraft: task.draftValues })} className="btn btn-primary btn-block mb-1"><Edit3 size={16} /> {task.status === 'En Proceso' ? 'Continuar Registro' : 'Iniciar Registro'}</button>;
                                };

                                return (
                                    <AccordionItem
                                        key={task.observationUnitId}
                                        value={itemValue}
                                        className={`card elev-sm p-3 animate-fade-in ${openTaskId === itemValue ? 'ring-1 ring-accent/50' : ''}`}
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <AccordionTrigger
                                            aria-label={`${task.observationUnitName} - ${task.status} - ${completedCount} de ${totalCount} variables registradas`}
                                        >
                                            <span className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                                <CircularProgress percentage={percentage} status={task.status} />
                                                <span className="min-w-0 flex-1 text-left">
                                                    <span className="card-title text-base sm:text-lg truncate block">{task.observationUnitName}</span>
                                                    <span className={`tag mt-1 ${task.status === 'Completado' ? 'tag-accent' : task.status === 'En Proceso' ? 'tag-outline' : 'tag-neutral'}`}>
                                                        {task.status === 'Completado' ? 'Completado' : task.status === 'En Proceso' ? 'En proceso' : 'Pendiente'}
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
