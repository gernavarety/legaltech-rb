/**
 * API клиент для LexAI.by бэкенда.
 * Все запросы передают JWT токен Supabase в Authorization: Bearer
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Типы ──────────────────────────────────────────────────────────────

export interface RiskItem {
  level: "высокий" | "средний" | "низкий";
  clause: string;
  issue: string;
  law_reference: string;
  recommendation: string;
}

export interface AnalysisResult {
  contract_type: string;
  overall_risk: "высокий" | "средний" | "низкий";
  summary: string;
  risks: RiskItem[];
  missing_clauses: string[];
  needs_lawyer: boolean;
}

export interface TaskStatus {
  task_id: string;
  status: "pending" | "processing" | "done" | "error";
  filename: string;
  contract_type?: string;
  overall_risk?: string;
  created_at?: string;
  result?: AnalysisResult;
  download_url?: string;
  error_message?: string;
}

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_usd: number;
  checks_per_month: number | null;
  max_file_mb: number;
  has_docx_download: boolean;
  has_history: boolean;
  has_api_access: boolean;
  has_priority_queue: boolean;
  max_team_members: number;
}

export interface SubscriptionInfo {
  plan_name: string;
  subscription: {
    subscription_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
  usage: {
    checks_used: number;
    checks_limit: number | null;
    is_unlimited: boolean;
  };
  features: {
    has_docx_download: boolean;
    has_history: boolean;
    has_api_access: boolean;
    has_priority_queue: boolean;
    max_team_members: number;
    max_file_mb: number;
  };
}

export interface HistoryDocument {
  id: string;
  filename: string;
  status: string;
  contract_type?: string;
  overall_risk?: string;
  report_url?: string;
  created_at: string;
}

export interface ApiError {
  code?: string;
  message: string;
  required_plans?: string[];
  current_plan?: string;
  upgrade_url?: string;
  httpStatus?: number;
}

// ── HTTP утилиты ──────────────────────────────────────────────────────

async function apiRequest<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    token?: string | null;
    formData?: FormData;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  if (options.body && !options.formData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: options.formData
      ? options.formData
      : options.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  if (!response.ok) {
    let errorData: { detail?: string | ApiError } = {};
    try {
      errorData = await response.json();
    } catch {}
    const detail = errorData.detail;
    if (typeof detail === "object" && detail !== null) {
      throw { ...detail, httpStatus: response.status };
    }
    throw new Error(
      typeof detail === "string"
        ? detail
        : `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// ── Документы ─────────────────────────────────────────────────────────

export async function uploadContract(
  file: File,
  token: string | null
): Promise<{ task_id: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ task_id: string }>("POST", "/api/upload", {
    formData,
    token,
  });
}

export async function getTaskStatus(
  taskId: string,
  token: string | null
): Promise<TaskStatus> {
  return apiRequest<TaskStatus>("GET", `/api/task/${taskId}`, { token });
}

export async function pollTaskStatus(
  taskId: string,
  token: string | null,
  onProgress?: (status: TaskStatus) => void,
  timeoutMs = 300_000
): Promise<TaskStatus> {
  const startTime = Date.now();
  const POLL_INTERVAL = 2000;

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("Превышено время ожидания анализа (5 минут)");
    }

    const status = await getTaskStatus(taskId, token);
    onProgress?.(status);

    if (status.status === "done" || status.status === "error") {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

export function getDownloadUrl(taskId: string): string {
  return `${API_BASE}/api/download/${taskId}`;
}

// ── Тарифы ────────────────────────────────────────────────────────────

export async function getPlans(): Promise<{ plans: Plan[] }> {
  return apiRequest<{ plans: Plan[] }>("GET", "/api/plans");
}

// ── Подписка ──────────────────────────────────────────────────────────

export async function getSubscription(token: string | null): Promise<SubscriptionInfo> {
  return apiRequest<SubscriptionInfo>("GET", "/api/subscription", { token });
}

export async function createCheckout(
  plan: "solo" | "firm",
  token: string | null
): Promise<{ payment_url: string; order_id: string; amount_byn: number; is_stub: boolean }> {
  return apiRequest("POST", "/api/subscription/checkout", {
    body: { plan },
    token,
  });
}

export async function cancelSubscription(
  token: string | null
): Promise<{ success: boolean; message: string; access_until: string }> {
  return apiRequest("POST", "/api/subscription/cancel", { token });
}

// ── Использование ─────────────────────────────────────────────────────

export async function getUsage(token: string | null) {
  return apiRequest<{
    checks_used: number;
    checks_limit: number | null;
    is_unlimited: boolean;
    period_end: string | null;
    plan_name: string;
  }>("GET", "/api/usage", { token });
}

// ── История документов ────────────────────────────────────────────────

export async function getHistory(
  token: string | null,
  page = 1,
  riskFilter?: string
): Promise<{
  documents: HistoryDocument[];
  total: number;
  page: number;
  pages: number;
}> {
  const params = new URLSearchParams({ page: String(page) });
  if (riskFilter) params.set("risk_filter", riskFilter);
  return apiRequest("GET", `/api/history?${params}`, { token });
}

export async function deleteDocument(
  docId: string,
  token: string | null
): Promise<{ success: boolean }> {
  return apiRequest("DELETE", `/api/history/${docId}`, { token });
}

// ── Команда ───────────────────────────────────────────────────────────

export async function getTeam(token: string | null) {
  return apiRequest<{
    members: Array<{
      id: string;
      member_id: string | null;
      invite_email: string;
      status: string;
      invited_at: string;
    }>;
    count: number;
    max_members: number;
  }>("GET", "/api/team", { token });
}

export async function inviteTeamMember(
  email: string,
  token: string | null
): Promise<{ success: boolean; message: string }> {
  return apiRequest("POST", "/api/team/invite", { body: { email }, token });
}

export async function removeTeamMember(
  memberEmail: string,
  token: string | null
): Promise<{ success: boolean }> {
  return apiRequest("DELETE", `/api/team/${encodeURIComponent(memberEmail)}`, { token });
}
