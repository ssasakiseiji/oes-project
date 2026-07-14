// Formas de las respuestas del backend NestJS (inflacion_app_backend_nest).
// Reconstruidas a partir de los servicios reales (admin/students/monitor/etc.),
// no de un contrato formal — ver memoria de migración para el porqué.
//
// Fase H/I: renombrado de dominio (Category/Product/Commerce/Price ->
// StudyField/Variable/ObservationUnit/Observation) + soporte real para
// variables de tipos distintos a numérico (categorical/boolean/text), ver
// VariableDataType/VariableConfig más abajo.

export type Role = 'admin' | 'monitor' | 'student';

export type VariableDataType = 'numeric' | 'categorical' | 'boolean' | 'text';

// Config por dataType -- ver inflacion_app_backend_nest/src/variables/dto/variable.schema.ts.
export interface NumericVariableConfig {
  isCurrency?: boolean;
  min?: number;
  max?: number;
  decimals?: number;
}
export interface CategoricalVariableConfig {
  options: string[];
}
export interface TextVariableConfig {
  maxLength?: number;
}
export type VariableConfig =
  | NumericVariableConfig
  | CategoricalVariableConfig
  | TextVariableConfig
  | null;

// Valor observado, ya resuelto a su tipo real (numericValue/textValue/
// booleanValue/choiceValue "aplanado" a un único campo por el backend en
// algunos endpoints, o expuesto en las 4 columnas en otros -- ver los tipos
// de fila específicos más abajo).
export type ObservationValue = number | string | boolean | null;

// Mapa variableId -> valor, usado en drafts/tareas de estudiante y monitor.
export type ObservationValueMap = Record<string, ObservationValue>;

export interface AuthUser {
  id: number;
  name: string;
  roles: string[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

// Projects module (Fase O-U). Ver ProjectsService/ProjectMembershipsService
// en inflacion_app_backend_nest/src/projects/ para las formas exactas.
export interface Project {
  id: number;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt?: string | null;
}

// Devuelto por GET /api/projects/mine -- alimenta ProjectContext. roles acá
// son los de la ProjectMembership del usuario en ese proyecto (o ['admin']
// sintético si el usuario es superadmin, ver ProjectsService#findMine).
export interface ProjectMembershipSummary {
  projectId: number;
  projectName: string;
  isArchived: boolean;
  roles: string[];
}

// Devuelto por GET /api/project-memberships?projectId=.
export interface ProjectMember {
  userId: number;
  name: string;
  email: string;
  roles: string[];
}

export interface StudyField {
  id: number;
  name: string;
  createdAt?: string | null;
}

export interface Variable {
  id: number;
  name: string;
  unit: string | null;
  dataType: VariableDataType;
  config: VariableConfig;
  studyFieldId: number | null;
  createdAt?: string | null;
}

export interface ObservationUnit {
  id: number;
  name: string;
  address: string | null;
  createdAt?: string | null;
}

export interface ObservationUnitWithStudents extends ObservationUnit {
  assigned_students_count: number;
  assigned_students: User[];
}

// AdminService#mapPeriod remapea start_date/end_date/created_at a snake_case
// para no romper el frontend, que nunca se actualizó a camelCase.
export interface Period {
  id: number;
  name: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string | null;
}

// Forma reducida de Period que devuelven students/monitor (select parcial).
export interface PeriodSummary {
  id: number;
  name: string;
  status: string;
}

export interface ObservationRow {
  id: number;
  createdAt: string;
  numericValue: number | string | null;
  textValue: string | null;
  booleanValue: boolean | null;
  choiceValue: string | null;
  dataType: VariableDataType;
  isCurrency: boolean;
  periodName: string;
  variableName: string;
  studyFieldName: string;
  userName: string;
  observationUnitName: string;
  isOutlier: boolean;
}

export interface VariableHistoryRow {
  name: string;
  avgValue: number | string | null;
}

export interface VariableDistributionEntry {
  periodName: string;
  counts: Record<string, number>;
}

export interface VariableAnalysis {
  id: number;
  name: string;
  valueA: number;
  valueB: number;
  variation: number;
}

export interface StudyFieldAnalysis {
  id: number;
  name: string;
  costA: number;
  costB: number;
  variation: number;
  variables: VariableAnalysis[];
}

export interface AnalysisResult {
  studyFieldAnalysis: StudyFieldAnalysis[];
  totalCostA: number;
  totalCostB: number;
  totalVariation: number;
}

// Students module

export interface StudentTasksResponse {
  variables: Variable[];
  studyFields: StudyField[];
  assignedObservationUnits: ObservationUnit[];
}

export type StudentTaskStatus = 'Pendiente' | 'Completado' | 'En Proceso';

export interface StudentTask {
  observationUnitId: number;
  observationUnitName: string;
  status: StudentTaskStatus;
  draftValues: ObservationValueMap;
  submittedValues: ObservationValueMap;
}

export interface StudentDashboardPeriod {
  periodId: number;
  periodName: string;
  status: string;
  tasks: StudentTask[];
}

// Monitor module

export type MonitorTaskStatus = 'Completado' | 'En Proceso' | 'Pendiente' | 'No completado';
export type CompletionLevel = 'bajo' | 'medio' | 'alto' | null;

export interface MonitorTask {
  observationUnitId: number;
  observationUnitName: string;
  status: MonitorTaskStatus;
  completionLevel: CompletionLevel;
  progress: { current: number; total: number };
  submittedValues: ObservationValueMap;
  draftValues: ObservationValueMap;
}

export interface MonitorStudent {
  studentId: number;
  studentName: string;
  tasks: MonitorTask[];
}

export interface MonitorPeriod {
  periodId: number;
  periodName: string;
  status: string;
  students: MonitorStudent[];
}

// Observation unit assignments module

export interface StudentWithAssignments {
  id: number;
  name: string;
  email: string;
  assignedObservationUnits: number[];
  assignedObservationUnitsData: ObservationUnit[];
}

export interface StudentsWithAssignmentsResponse {
  students: StudentWithAssignments[];
  allObservationUnits: ObservationUnit[];
}

export interface StudentAssignment {
  id: number;
  observation_unit_id: number;
  observation_unit_name: string;
  observation_unit_address: string | null;
  assigned_at: string | null;
}

export interface AssignmentsSummaryRow {
  observation_unit_id: number;
  observation_unit_name: string;
  assigned_students: number;
  student_names: string[];
}

export interface ObservationUnitStudent {
  id: number;
  name: string;
  email: string;
  assigned_at: string | null;
}

// Request payloads (deben calzar con los zod schemas del backend, ver
// variables/dto/variable.schema.ts, students/dto/student.schema.ts, etc.)

export interface CreateStudyFieldPayload {
  name: string;
}

export interface CreateVariablePayload {
  name: string;
  unit?: string;
  studyFieldId: number;
  dataType: VariableDataType;
  config?: VariableConfig;
  projectId: number;
}

export interface UpdateVariablePayload {
  name: string;
  unit?: string;
  config?: VariableConfig;
}

export interface ObservationUnitPayload {
  name: string;
  address: string;
}

export interface CreatePeriodPayload {
  name: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  projectId: number;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  roles?: string[];
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  roles: string[];
}

export interface ObservationFilters {
  periodId?: number | string;
  studyFieldId?: number | string;
  variableId?: number | string;
  userId?: number | string;
  observationUnitId?: number | string;
  showOutliersOnly?: boolean;
}

export interface ValueEntryPayload {
  variableId: number;
  value: ObservationValue;
}

export interface SaveDraftPayload {
  observationUnitId: number;
  values?: ValueEntryPayload[];
}

export interface SubmitObservationsPayload {
  observationUnitId: number;
  values: ValueEntryPayload[];
}

export interface UpdateObservationPayload {
  value: number | string | boolean;
}
