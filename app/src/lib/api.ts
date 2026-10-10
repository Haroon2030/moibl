import { Platform } from 'react-native';

/** عنوان الخادم: متغير البيئة EXPO_PUBLIC_API_URL، وإلا القيمة الافتراضية للتطوير المحلي. */
export const PRODUCTION_API_URL = 'https://mobil.alrsheed.net';
export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? (Platform.OS === 'android' ? 'http://10.0.2.2:8010' : 'http://localhost:8010') : PRODUCTION_API_URL);

let baseUrl = DEFAULT_API_URL;
let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const getBaseUrl = () => baseUrl;
export const setBaseUrl = (url: string) => {
  baseUrl = url.trim().replace(/\/+$/, '') || DEFAULT_API_URL;
};
export const setAuthToken = (token: string | null) => {
  authToken = token;
};
export const onUnauthorized = (fn: (() => void) | null) => {
  unauthorizedHandler = fn;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const TIMEOUT_MS = 20000;

async function request<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const hadToken = !!authToken;
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* استجابة بلا JSON */
    }
    if (!res.ok) {
      if (res.status === 401 && hadToken && unauthorizedHandler) unauthorizedHandler();
      const detail = data && typeof data.detail === 'string' ? data.detail : null;
      throw new ApiError(detail || 'تعذّر إتمام الطلب. حاول لاحقاً.', res.status);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(
      aborted ? 'انتهت مهلة الاتصال بالخادم.' : 'تعذّر الاتصال بالخادم. تحقق من الشبكة أو من عنوان الخادم.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── الأنواع ────────────────────────────────────────────────────────────────
export type Kind = 'employee' | 'manager';

export interface EmployeeProfile {
  id: number;
  name: string;
  employee_number: string;
  branch: string | null;
  department: string | null;
  profession: string | null;
  status: string;
  status_display: string;
  hire_date: string | null;
}

export interface ManagerProfile {
  id: number;
  name: string;
  username: string;
  role: string | null;
  branches: string[];
  is_admin?: boolean;
}

export interface LoginResult<P> {
  token: string;
  kind: Kind;
  profile: P;
}

export interface SummaryItem {
  label: string;
  value: string;
}

export interface Summary {
  profile: EmployeeProfile;
  leave_balance: string | null;
  active_loans: number;
  loans_remaining: string | null;
  open_requests: number;
  last_salary_change: { effective_date: string | null; new_basic_salary: string | null } | null;
}

export interface Loan {
  id: number;
  serial_number: string;
  amount: string | null;
  monthly_deduction: string | null;
  installments: number;
  reason: string;
  issued_at: string | null;
  first_deduction_date: string | null;
  status: string;
  status_display: string;
  remaining_balance: string | null;
}

export interface LoanDetail extends Loan {
  installments_log: { period: string; due_date: string | null; amount: string | null; status: string; status_display: string }[];
}

export interface SalaryData {
  current: { basic_salary: string | null; total_salary: string | null };
  changes: {
    id: number;
    effective_date: string | null;
    old_basic_salary: string | null;
    new_basic_salary: string | null;
    difference: string | null;
    reason: string;
    applied: boolean;
  }[];
}

export interface LeavesData {
  balance: { accrued: string | null; remaining: string | null };
  results: {
    id: number;
    leave_type: string;
    leave_type_display: string;
    date_from: string | null;
    date_to: string | null;
    days: string | null;
    notes: string;
  }[];
}

export interface Absence {
  id: number;
  serial_number: string;
  absence_date: string | null;
  days: number;
  deduction_amount: string | null;
  reason: string;
}

export interface Statement {
  id: number;
  serial_number: string;
  statement_type: string;
  statement_type_display: string;
  title: string;
  statement_date: string | null;
  deduction_amount: string | null;
  content?: string;
}

export interface ActionItem {
  id: number;
  type: string;
  type_display: string;
  status: string;
  status_display: string;
  requested_at: string | null;
  summary: SummaryItem[];
  employee?: string;
  branch?: string;
}

export interface Approval extends ActionItem {
  can_approve: boolean;
  can_return: boolean;
  requested_by?: string | null;
  branch_notes?: string;
}

// ── طلبات الموظف (رفع إجازة/سلفة) ───────────────────────────────────────────
export interface RequestOptions {
  leave: { types: { key: string; label: string }[]; balance: string | null; has_sponsorship: boolean; max_days: number };
  loan: { max_installments: number; open_request: boolean };
}

export interface LeaveRequestInput {
  leave_type: string;
  date_from: string;
  date_to: string;
  notes: string;
}

export interface LoanRequestInput {
  amount: string;
  installments: number;
  reason: string;
}

// ── الأدمن: بيانات الموظفين ────────────────────────────────────────────────
export interface CountRow {
  label: string;
  count: number;
}

export interface EmployeesOverview {
  total: number;
  working: number;
  statuses: { key: string; label: string; count: number }[];
  male: number;
  female: number;
  hired_last_30: number;
  by_branch: CountRow[];
  by_department: CountRow[];
  by_nationality: CountRow[];
  expiring: { window_days: number; contract: number; medical_insurance: number; health_card: number };
}

export interface EmployeeFilters {
  branches: { id: number; name: string }[];
  departments: { id: number; name: string }[];
}

export interface EmployeeRow {
  id: number;
  name: string;
  employee_number: string;
  branch: string | null;
  department: string | null;
  profession: string | null;
  nationality: string | null;
  phone: string;
  status: string;
  status_display: string;
  hire_date: string | null;
}

export interface EmployeesPage {
  total: number;
  limit: number;
  offset: number;
  results: EmployeeRow[];
}

export interface EmployeeFull extends EmployeeRow {
  sections: { title: string; icon: string; rows: { label: string; value: string | null }[] }[];
  notes: { title: string; text: string }[];
}

export interface EmployeeQuery {
  q?: string;
  status?: string;
  branch?: number | null;
  department?: number | null;
  offset?: number;
  limit?: number;
}

// ── النقاط ────────────────────────────────────────────────────────────────
type Results<T> = { results: T[] };

export const api = {
  loginEmployee: (employee_number: string, id_number: string) =>
    request<LoginResult<EmployeeProfile>>('/m/v1/auth/employee/', { method: 'POST', body: { employee_number, id_number } }),
  loginManager: (username: string, password: string) =>
    request<LoginResult<ManagerProfile>>('/m/v1/auth/manager/', { method: 'POST', body: { username, password } }),
  me: () => request<{ kind: Kind; profile: EmployeeProfile | ManagerProfile }>('/m/v1/me/'),

  summary: () => request<Summary>('/m/v1/employee/summary/'),
  loans: () => request<Results<Loan>>('/m/v1/employee/loans/'),
  loan: (id: number) => request<LoanDetail>(`/m/v1/employee/loans/${id}/`),
  salary: () => request<SalaryData>('/m/v1/employee/salary/'),
  leaves: () => request<LeavesData>('/m/v1/employee/leaves/'),
  absences: () => request<Results<Absence>>('/m/v1/employee/absences/'),
  statements: () => request<Results<Statement>>('/m/v1/employee/statements/'),
  statement: (id: number) => request<Statement>(`/m/v1/employee/statements/${id}/`),
  myRequests: () => request<Results<ActionItem>>('/m/v1/employee/requests/'),

  approvals: (scope: 'pending' | 'all') => request<Results<Approval>>(`/m/v1/manager/approvals/?scope=${scope}`),
  approval: (id: number) => request<Approval>(`/m/v1/manager/approvals/${id}/`),
  approve: (id: number, notes: string) => request<Approval>(`/m/v1/manager/approvals/${id}/approve/`, { method: 'POST', body: { notes } }),
  returnApproval: (id: number, notes: string) =>
    request<Approval>(`/m/v1/manager/approvals/${id}/return/`, { method: 'POST', body: { notes } }),

  requestOptions: () => request<RequestOptions>('/m/v1/employee/requests/options/'),
  submitLeave: (body: LeaveRequestInput) => request<ActionItem>('/m/v1/employee/requests/leave/', { method: 'POST', body }),
  submitLoan: (body: LoanRequestInput) => request<ActionItem>('/m/v1/employee/requests/loan/', { method: 'POST', body }),

  adminOverview: () => request<EmployeesOverview>('/m/v1/admin/employees/overview/'),
  adminFilters: () => request<EmployeeFilters>('/m/v1/admin/employees/filters/'),
  adminEmployees: (p: EmployeeQuery) => {
    const qs = new URLSearchParams();
    if (p.q) qs.set('q', p.q);
    if (p.status) qs.set('status', p.status);
    if (p.branch) qs.set('branch', String(p.branch));
    if (p.department) qs.set('department', String(p.department));
    qs.set('offset', String(p.offset ?? 0));
    qs.set('limit', String(p.limit ?? 30));
    return request<EmployeesPage>(`/m/v1/admin/employees/?${qs.toString()}`);
  },
  adminEmployee: (id: number) => request<EmployeeFull>(`/m/v1/admin/employees/${id}/`),
};
