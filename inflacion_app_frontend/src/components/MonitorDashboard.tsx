import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { CheckCircle, Clock, Search, ListFilter, Smile, Store, ArrowUpDown, ChevronLeft, ChevronRight as ChevronRightIcon, SlidersHorizontal, XCircle, Check } from 'lucide-react';
import { apiFetch } from '../api';
import { useProject } from '../contexts/ProjectContext';
import { LOADING_FADE_MS, useDelayedLoading } from '../hooks/useDelayedLoading';
import PeriodDropdown, { type PeriodOption } from './student/PeriodDropdown';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import type {
    AuthUser,
    CompletionLevel,
    MonitorPeriod,
    MonitorStudent,
    MonitorTaskStatus,
    ObservationValueMap,
    StudentTasksResponse,
    StudyField,
    Variable,
} from '../types/api';

// `false` (booleano) es una respuesta válida, no la ausencia de una -- el
// código pre-rename usaba `prices[p.id] || prices[p.id] === 0`, que
// funcionaba para 0 pero no para `false` (Fase L, bug corregido de paso).
const hasValidValue = (value: unknown): value is number | string | boolean => value != null && value !== '';

function formatValuePreview(variable: Variable, value: unknown): string {
    if (!hasValidValue(value)) return 'N/A';
    switch (variable.dataType) {
        case 'numeric': {
            const num = Number(value);
            return new Intl.NumberFormat('es-PY').format(num);
        }
        case 'boolean':
            return value ? 'Sí' : 'No';
        default:
            return String(value);
    }
}

// --- Componentes de UI Reutilizables ---

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full w-full p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
    </div>
);

interface StatCardProps {
    title: string;
    value: ReactNode;
}

// Misma identidad que las tarjetas del panel de estudiante: `card-flat`, sin
// superficie propia. Sin ícono: no aportaba información (el KPI se lee por su
// etiqueta y su número) y era el que forzaba la altura de la tarjeta -- sacarlo
// deja una tira de tres tiles compactas en vez de tres bloques grandes.
const StatCard = ({ title, value }: StatCardProps) => (
    <div className="card card-flat px-3 py-2 gap-0">
        <p className="text-[11px] uppercase tracking-wide text-muted font-medium truncate">{title}</p>
        <p className="text-xl font-medium text-ink leading-tight">{value}</p>
    </div>
);

interface ProgressBarProps {
    current: number;
    total: number;
    size?: 'sm' | 'md' | 'lg';
}

const ProgressBar = ({ current, total, size = 'md' }: ProgressBarProps) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3'
    };
    const fillColor = percentage === 100 ? 'var(--color-success)' : 'var(--color-accent)';

    return (
        <div className={`w-full rounded-full overflow-hidden ${sizeClasses[size]}`} style={{ background: 'var(--color-nc-neutral-800)' }}>
            <div
                className={`${sizeClasses[size]} rounded-full transition-all duration-300`}
                style={{ width: `${percentage}%`, background: fillColor }}
            />
        </div>
    );
};

interface RegistrationSummaryProps {
    variables: Variable[];
    studyFields: StudyField[];
    values: ObservationValueMap;
}

// Mismo principio que el resumen del estudiante: un solo nivel de superficie
// (ya cubierto por la tarjeta de la tarea, en el padre) -- filas planas
// separadas por líneas, sin fondos tintados por fila.
const RegistrationSummary = ({ variables, studyFields, values }: RegistrationSummaryProps) => {
    const summaryData = useMemo(() => {
        return studyFields.map(field => {
            const fieldVariables = variables.filter(v => v.studyFieldId === field.id);
            const completedCount = fieldVariables.filter(v => hasValidValue(values[v.id])).length;
            return { ...field, variables: fieldVariables, completedCount };
        });
    }, [studyFields, variables, values]);

    return (
        <div className="pt-3 mt-1" style={{ borderTop: '1px solid var(--color-divider)' }}>
            <h4 className="text-[11px] uppercase tracking-wide text-accent-300 mb-2 px-1">Detalle de Variables</h4>
            <Accordion type="single" collapsible>
                {summaryData.map(field => (
                    <AccordionItem key={field.id} value={String(field.id)}>
                        <AccordionTrigger className="px-1 py-2.5 hover:text-accent-300">
                            <span className="flex-1 min-w-0 text-left">
                                <span className="text-sm font-medium text-ink truncate block">{field.name}</span>
                                <span className="mt-1 block max-w-[220px]"><ProgressBar current={field.completedCount} total={field.variables.length} size="sm" /></span>
                            </span>
                            <span className="text-sm text-muted flex-shrink-0">{field.completedCount} / {field.variables.length}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                            <ul className="pb-2">
                                {field.variables.map((v, i) => (
                                    <li
                                        key={v.id}
                                        className="flex justify-between items-center gap-2 py-2 px-1 text-sm"
                                        style={i > 0 ? { borderTop: '1px solid var(--color-divider)' } : undefined}
                                    >
                                        <span className="text-ink truncate">{v.name}</span>
                                        <span className="tabular-nums text-accent-300 flex-shrink-0">{formatValuePreview(v, values[v.id])}</span>
                                    </li>
                                ))}
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
};

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--color-divider)' }}>
            <p className="text-sm text-muted hidden sm:block">
                Página <span className="font-medium text-ink">{currentPage}</span> de{' '}
                <span className="font-medium text-ink">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1 w-full sm:w-auto">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-icon btn-secondary"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="hidden sm:flex items-center gap-1">
                    {startPage > 1 && (
                        <>
                            <button onClick={() => onPageChange(1)} className="btn btn-secondary">1</button>
                            {startPage > 2 && <span className="text-muted px-1">…</span>}
                        </>
                    )}
                    {pages.map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={page === currentPage ? 'btn btn-primary' : 'btn btn-secondary'}
                        >
                            {page}
                        </button>
                    ))}
                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <span className="text-muted px-1">…</span>}
                            <button onClick={() => onPageChange(totalPages)} className="btn btn-secondary">{totalPages}</button>
                        </>
                    )}
                </div>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn btn-icon btn-secondary"
                >
                    <ChevronRightIcon size={18} />
                </button>
            </div>
        </div>
    );
};

type SortBy = 'name' | 'progress' | 'status' | 'level';

function MonitorDashboard({ user: _user }: { user: AuthUser }) {
  const { activeProjectId } = useProject();

  const [monitorData, setMonitorData] = useState<MonitorPeriod[]>([]);
  const [staticData, setStaticData] = useState<{ variables: Variable[]; studyFields: StudyField[] }>({ variables: [], studyFields: [] });
  const [isLoading, setIsLoading] = useState(true);
  // Ver useDelayedLoading: nada durante la ventana de gracia, y un mínimo
  // en pantalla una vez montado.
  const showSpinner = useDelayedLoading(isLoading);
  const [error, setError] = useState<string | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState<SortBy>('name'); // name, progress, status
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // '' (y no undefined) para el estado "ninguno abierto": con undefined Radix
  // trata al Accordion como no controlado y warnea al recibir un value real.
  const [openStudentId, setOpenStudentId] = useState('');
  const [openTaskId, setOpenTaskId] = useState('');

  useEffect(() => {
    const fetchMonitorData = async () => {
      try {
        const [progressData, catalogData] = await Promise.all([
          apiFetch<MonitorPeriod[]>(`/api/monitor-data?projectId=${activeProjectId}`),
          apiFetch<StudentTasksResponse>(`/api/student-tasks?projectId=${activeProjectId}`)
        ]);
        setMonitorData(progressData);
        setStaticData({ variables: catalogData.variables, studyFields: catalogData.studyFields });

        const openPeriod = progressData.find(p => p.status === 'Open');
        if (openPeriod) {
            setSelectedPeriod({ value: openPeriod.periodId, label: openPeriod.periodName, status: openPeriod.status });
        } else if (progressData.length > 0) {
            const firstPeriod = progressData[0];
            setSelectedPeriod({ value: firstPeriod.periodId, label: firstPeriod.periodName, status: firstPeriod.status });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonitorData();
  }, [activeProjectId]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, selectedPeriod]);

  const periodOptions = useMemo<PeriodOption[]>(() => monitorData.map(p => ({
      value: p.periodId,
      label: p.periodName,
      status: p.status,
  })), [monitorData]);

  const activePeriodData = useMemo(() => {
      if (!selectedPeriod) return null;
      return monitorData.find(p => p.periodId === selectedPeriod.value);
  }, [selectedPeriod, monitorData]);

  const globalStats = useMemo(() => {
    if (!activePeriodData) return { totalStudents: 0, completionPercentage: 0, totalTasks: 0, completedTasks: 0 };
    const { students } = activePeriodData;
    const totalStudents = students.length;
    let totalTasks = 0;
    let completedTasks = 0;
    students.forEach(student => {
      totalTasks += student.tasks.length;
      completedTasks += student.tasks.filter(t => t.status === 'Completado').length;
    });
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    return { totalStudents, completionPercentage, totalTasks, completedTasks };
  }, [activePeriodData]);

  const sortedAndFilteredStudents = useMemo(() => {
    if (!activePeriodData) return [];

    const filtered = activePeriodData.students
      .filter(student => student.studentName.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(student => {
        if (statusFilter === 'Todos') return true;
        // Filter by completion level: "Completado:alto", "Completado:medio", "Completado:bajo"
        if (statusFilter.startsWith('Completado:')) {
          const level = statusFilter.split(':')[1];
          return student.tasks.some(task => task.status === 'Completado' && task.completionLevel === level);
        }
        return student.tasks.some(task => task.status === statusFilter);
      });

    // Sorting
    const levelOrder: Record<string, number> = { alto: 3, medio: 2, bajo: 1, null: 0 };
    const students = filtered.map(student => {
      const completedTasksCount = student.tasks.filter(t => t.status === 'Completado').length;
      const totalTasksCount = student.tasks.length;
      const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
      // Best completion level among tasks (for sorting)
      const bestLevel = student.tasks.reduce((best, t) => {
        const current = levelOrder[String(t.completionLevel)] || 0;
        return current > best ? current : best;
      }, 0);
      return { ...student, completedTasksCount, totalTasksCount, progressPercentage, bestLevel };
    });

    students.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.studentName.localeCompare(b.studentName);
        case 'progress':
          return b.progressPercentage - a.progressPercentage;
        case 'status': {
          // Primero los que tienen tareas sin completar
          const aHasIncomplete = a.tasks.some(t => t.status !== 'Completado');
          const bHasIncomplete = b.tasks.some(t => t.status !== 'Completado');
          if (aHasIncomplete && !bHasIncomplete) return -1;
          if (!aHasIncomplete && bHasIncomplete) return 1;
          return a.studentName.localeCompare(b.studentName);
        }
        case 'level':
          // Ordenar por nivel de completitud (bajo primero = más problemáticos arriba)
          if (a.bestLevel !== b.bestLevel) return a.bestLevel - b.bestLevel;
          return a.studentName.localeCompare(b.studentName);
        default:
          return 0;
      }
    });

    return students;
  }, [activePeriodData, searchTerm, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedAndFilteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredStudents, currentPage, itemsPerPage]);

  if (activeProjectId === null) return null;
  // Nunca se pasa por el vacío: durante la ventana de gracia el spinner se
  // monta igual pero invisible (ver LoadingArea, mismo criterio).
  if (isLoading || showSpinner) {
    return (
      <div style={{ opacity: showSpinner ? 1 : 0, transition: `opacity ${LOADING_FADE_MS}ms ease` }}>
        <LoadingSpinner />
      </div>
    );
  }
  if (error) return <div className="text-center p-8 text-danger">Error: {error}</div>;

  const getStatusChip = (status: MonitorTaskStatus, completionLevel: CompletionLevel) => {
    const completionColor: Record<'alto' | 'medio' | 'bajo', string> = {
      alto: 'var(--color-success)',
      medio: 'var(--color-accent-2)',
      bajo: 'var(--color-danger)',
    };
    const color: Record<MonitorTaskStatus, string> = {
      'Completado': completionLevel ? completionColor[completionLevel] : 'var(--color-success)',
      'En Proceso': 'var(--color-accent)',
      'Pendiente': 'var(--color-nc-neutral-500)',
      'No completado': 'var(--color-danger)',
    };
    const icon: Record<MonitorTaskStatus, ReactNode> = {
        'Completado': completionLevel === 'bajo' ? <Clock size={13} /> : <CheckCircle size={13} />,
        'En Proceso': <Clock size={13} />,
        'Pendiente': <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-nc-neutral-600)' }} />,
        'No completado': <XCircle size={13} />
    };
    const levelLabels: Record<'alto' | 'medio' | 'bajo', string> = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };
    const label = status === 'Completado' && completionLevel
        ? `${status}: ${levelLabels[completionLevel]}`
        : status;
    return (
        <span className="tag flex items-center gap-1.5" style={{ border: `1px solid ${color[status]}`, color: color[status] }}>
            {icon[status]}
            <span>{label}</span>
        </span>
    );
  };

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'name', label: 'Nombre A-Z' },
    { value: 'progress', label: 'Progreso (mayor a menor)' },
    { value: 'status', label: 'Estado (pendientes primero)' },
    { value: 'level', label: 'Nivel (menor completitud primero)' }
  ];

  const filterOptions: { value: string; label: string; indent?: boolean }[] = [
    { value: 'Todos', label: 'Todos' },
    { value: 'Completado', label: 'Completado (todos)' },
    { value: 'Completado:alto', label: 'Completado: Alto', indent: true },
    { value: 'Completado:medio', label: 'Completado: Medio', indent: true },
    { value: 'Completado:bajo', label: 'Completado: Bajo', indent: true },
    { value: 'En Proceso', label: 'En Proceso' },
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'No completado', label: 'No completado' },
  ];

  return (
    <div className="space-y-6">
      {/* Selector de Período */}
      <div className="field max-w-sm">
        <label>Período Activo</label>
        <PeriodDropdown options={periodOptions} value={selectedPeriod} onChange={setSelectedPeriod} align="start" />
      </div>

      {/* Stats Cards */}
      {/* Tres tiles chicas en una sola tira: ya no son bloques que compitan con
          la lista de estudiantes, que es el contenido real del panel. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard title="Estudiantes" value={globalStats.totalStudents} />
        <StatCard title="Tareas Completadas" value={`${globalStats.completedTasks}/${globalStats.totalTasks}`} />
        <StatCard title="Progreso Global" value={`${globalStats.completionPercentage.toFixed(1)}%`} />
      </div>

      {/* Barra de progreso global */}
      {globalStats.totalTasks > 0 && (
        <div className="card card-flat p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-ink">Progreso General del Período</h3>
            <span className="text-2xl font-medium text-accent-300">{globalStats.completionPercentage.toFixed(1)}%</span>
          </div>
          <ProgressBar current={globalStats.completedTasks} total={globalStats.totalTasks} size="lg" />
        </div>
      )}

      {/* Búsqueda y Controles */}
      <div>
          <div className="flex items-center gap-3">
              {/* Búsqueda */}
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                      type="text"
                      placeholder="Buscar estudiante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input pl-10"
                  />
              </div>

              {/* Botón de Ordenamiento */}
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <button className="btn btn-icon btn-secondary" title="Ordenar">
                          <ArrowUpDown size={18} />
                      </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                      {sortOptions.map(option => (
                          <DropdownMenuItem
                              key={option.value}
                              onSelect={() => setSortBy(option.value)}
                              className={`py-2 ${sortBy === option.value ? 'text-accent-300 font-semibold' : ''}`}
                          >
                              {sortBy === option.value && <Check size={14} />}
                              <span className={sortBy === option.value ? '' : 'pl-[22px]'}>{option.label}</span>
                          </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
              </DropdownMenu>

              {/* Botón de Filtros */}
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <button className="btn btn-icon btn-secondary relative" title="Filtrar por estado">
                          <SlidersHorizontal size={18} />
                          {statusFilter !== 'Todos' && (
                              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent" />
                          )}
                      </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                      {filterOptions.map(option => (
                          <DropdownMenuItem
                              key={option.value}
                              onSelect={() => setStatusFilter(option.value)}
                              className={`py-2 ${option.indent ? 'pl-7' : ''} ${statusFilter === option.value ? 'text-accent-300 font-semibold' : ''}`}
                          >
                              {statusFilter === option.value && <Check size={14} />}
                              <span className={statusFilter === option.value ? '' : 'pl-[22px]'}>{option.label}</span>
                          </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>

          {/* Contador de resultados */}
          <p className="text-sm text-muted mt-3">
              {sortedAndFilteredStudents.length} estudiante{sortedAndFilteredStudents.length !== 1 ? 's' : ''}
              {statusFilter !== 'Todos' && (
                  <span className="tag tag-accent ml-2">
                      {filterOptions.find(o => o.value === statusFilter)?.label || statusFilter}
                  </span>
              )}
          </p>
      </div>

      {/* Lista de Estudiantes */}
      <div>
        {paginatedStudents.length > 0 ? (
          <>
            <Accordion
              type="single"
              collapsible
              className="gap-3"
              value={openStudentId}
              onValueChange={setOpenStudentId}
            >
              {paginatedStudents.map((student: MonitorStudent & { completedTasksCount: number; totalTasksCount: number; progressPercentage: number }) => {
                const { completedTasksCount, totalTasksCount, progressPercentage } = student;
                const isStudentUpToDate = completedTasksCount === totalTasksCount;
                const studentValue = String(student.studentId);

                return (
                  <AccordionItem
                    key={student.studentId}
                    value={studentValue}
                    className={`card card-flat p-3 ${openStudentId === studentValue ? 'border-accent/40' : ''}`}
                  >
                    <AccordionTrigger>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-ink truncate">{student.studentName}</h3>
                          {isStudentUpToDate && (
                              <span className="tag tag-accent flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  Al día
                              </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted mb-2">
                          <div className="flex items-center gap-1.5">
                            <Store size={14} />
                            <span>{totalTasksCount} comercio{totalTasksCount !== 1 ? 's' : ''}</span>
                          </div>
                          <span>{completedTasksCount}/{totalTasksCount} completado{completedTasksCount !== 1 ? 's' : ''}</span>
                          <span className="text-accent-300 font-semibold">{progressPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="max-w-sm"><ProgressBar current={completedTasksCount} total={totalTasksCount} size="md" /></div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent>
                      <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--color-divider)' }}>
                        <Accordion
                          type="single"
                          collapsible
                          value={openTaskId}
                          onValueChange={setOpenTaskId}
                        >
                          {student.tasks.map(task => {
                            const currentTaskId = `${student.studentId}-${task.observationUnitId}`;
                            const taskPercentage = task.progress.total > 0 ? (task.progress.current / task.progress.total) * 100 : 0;

                            return (
                              <AccordionItem key={task.observationUnitId} value={currentTaskId} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-divider)' }}>
                                <AccordionTrigger className="py-3">
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <p className="font-medium text-sm text-ink truncate">{task.observationUnitName}</p>
                                      {getStatusChip(task.status, task.completionLevel)}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs tabular-nums text-muted">
                                        {task.progress.current} / {task.progress.total} variables
                                      </span>
                                      <span className="text-xs text-accent-300 font-semibold">
                                        {taskPercentage.toFixed(0)}%
                                      </span>
                                      {/* Fase AD: las "no disponible" ya están contadas arriba
                                          (relevarlas es trabajo), así que sin este dato un
                                          registro con 10 ausencias se lee idéntico a uno con 10
                                          datos. El chip de estado ya lo refleja -- su nivel de
                                          completitud se calcula descontándolas -- pero esto dice
                                          por qué. */}
                                      {task.progress.unavailable > 0 && (
                                        <span className="text-xs text-muted italic">
                                          {task.progress.unavailable} sin dato
                                        </span>
                                      )}
                                    </div>
                                    <div className="max-w-xs"><ProgressBar current={task.progress.current} total={task.progress.total} size="sm" /></div>
                                  </div>
                                </AccordionTrigger>

                                <AccordionContent>
                                  <RegistrationSummary
                                      variables={staticData.variables}
                                      studyFields={staticData.studyFields}
                                      values={task.status === 'Completado' ? (task.submittedValues || {}) : (task.draftValues || {})}
                                  />
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* Paginación */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        ) : (
            <div className="card card-flat text-center py-16">
                <ListFilter size={48} className="mx-auto text-muted mb-4" />
                <h3 className="text-lg font-medium text-ink">No se encontraron estudiantes</h3>
                <p className="mt-2 text-muted">Prueba a cambiar el filtro o el término de búsqueda.</p>
            </div>
        )}
         {monitorData.length === 0 && !isLoading && (
            <div className="card card-flat text-center py-16">
                <Smile size={48} className="mx-auto text-accent mb-4" />
                <h3 className="text-lg font-medium text-ink">Todo tranquilo por aquí</h3>
                <p className="mt-2 text-muted">Aún no hay datos de períodos para mostrar.</p>
            </div>
         )}
      </div>
    </div>
  );
}
export default MonitorDashboard;
