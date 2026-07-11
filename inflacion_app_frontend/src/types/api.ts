// Formas de las respuestas del backend NestJS (inflacion_app_backend_nest).
// Reconstruidas a partir de los servicios reales (admin/students/monitor/etc.),
// no de un contrato formal — ver memoria de migración para el porqué.

export type Role = 'admin' | 'monitor' | 'student';

// Mapa productId -> precio, usado en el estado local del asistente de
// registro y en los draftPrices/submittedPrices de tareas de estudiante.
export type PriceMap = Record<string, number | string>;

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

export interface Category {
  id: number;
  name: string;
  createdAt?: string | null;
}

export interface Product {
  id: number;
  name: string;
  unit: string;
  categoryId: number | null;
  createdAt?: string | null;
}

export interface Commerce {
  id: number;
  name: string;
  address: string | null;
  createdAt?: string | null;
}

export interface CommerceWithStudents extends Commerce {
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

export interface PriceRow {
  id: number;
  price: number | string;
  createdAt: string;
  periodName: string;
  productName: string;
  categoryName: string;
  userName: string;
  commerceName: string;
  isOutlier: boolean;
}

export interface HistoricalRow {
  name: string;
  avgPrice: number | string | null;
}

export interface ProductAnalysis {
  id: number;
  name: string;
  priceA: number;
  priceB: number;
  variation: number;
}

export interface CategoryAnalysis {
  id: number;
  name: string;
  costA: number;
  costB: number;
  variation: number;
  products: ProductAnalysis[];
}

export interface AnalysisResult {
  categoryAnalysis: CategoryAnalysis[];
  totalCostA: number;
  totalCostB: number;
  totalVariation: number;
}

// Students module

export interface StudentTasksResponse {
  products: Product[];
  categories: Category[];
  assignedCommerces: Commerce[];
}

export type StudentTaskStatus = 'Pendiente' | 'Completado' | 'En Proceso';

export interface StudentTask {
  commerceId: number;
  commerceName: string;
  status: StudentTaskStatus;
  draftPrices: Record<string, number | string>;
  submittedPrices: Record<string, number | string>;
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
  commerceId: number;
  commerceName: string;
  status: MonitorTaskStatus;
  completionLevel: CompletionLevel;
  progress: { current: number; total: number };
  submittedPrices: Record<string, number | string>;
  draftPrices: Record<string, number | string>;
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

// Commerce assignments module

export interface StudentWithAssignments {
  id: number;
  name: string;
  email: string;
  assignedCommerces: number[];
  assignedCommercesData: Commerce[];
}

export interface StudentsWithAssignmentsResponse {
  students: StudentWithAssignments[];
  allCommerces: Commerce[];
}

export interface StudentAssignment {
  id: number;
  commerce_id: number;
  commerce_name: string;
  commerce_address: string | null;
  assigned_at: string | null;
}

export interface AssignmentsSummaryRow {
  commerce_id: number;
  commerce_name: string;
  assigned_students: number;
  student_names: string[];
}

export interface CommerceStudent {
  id: number;
  name: string;
  email: string;
  assigned_at: string | null;
}

// Request payloads (deben calzar con los zod schemas del backend, ver
// admin/dto/admin.schema.ts, students/dto/student.schema.ts, etc.)

export interface CreatePeriodPayload {
  name: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
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

export interface PriceFilters {
  periodId?: number | string;
  categoryId?: number | string;
  productId?: number | string;
  userId?: number | string;
  commerceId?: number | string;
  showOutliersOnly?: boolean;
}

export interface SaveDraftPayload {
  commerceId: number;
  prices?: Record<string, number | string | null>;
}

export interface PriceEntryPayload {
  productId: number;
  commerceId: number;
  price: number;
}
