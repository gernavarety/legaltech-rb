/**
 * API клиент для взаимодействия с FastAPI бэкендом.
 * Все запросы идут через Next.js rewrite proxy (/api/* → backend:8000/api/*).
 */

const API_BASE = '/api'

export interface RiskItem {
  level: string
  clause: string
  issue: string
  law_reference: string
  recommendation: string
}

export interface AnalysisResult {
  contract_type: string
  overall_risk: string
  summary: string
  risks: RiskItem[]
  missing_clauses: string[]
  needs_lawyer: boolean
}

export interface UploadResponse {
  task_id: string
  status: string
  message: string
}

export interface TaskStatusResponse {
  task_id: string
  status: 'pending' | 'processing' | 'done' | 'error'
  filename?: string
  contract_type?: string
  overall_risk?: string
  result?: AnalysisResult
  download_url?: string
  error_message?: string
  created_at?: string
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail: string | undefined
    try {
      const data = await response.json()
      detail = data.detail || data.message
    } catch {
      // JSON parse failed
    }
    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      detail,
    )
  }
  return response.json() as Promise<T>
}

/**
 * Загружает файл договора на сервер.
 * Возвращает task_id для отслеживания прогресса.
 */
export async function uploadContract(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse<UploadResponse>(response)
}

/**
 * Получает статус задачи по task_id.
 * Используется для polling каждые 2 секунды.
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(`${API_BASE}/task/${taskId}`, {
    cache: 'no-store',
  })
  return handleResponse<TaskStatusResponse>(response)
}

/**
 * Формирует URL для скачивания готового DOCX-отчёта.
 */
export function getDownloadUrl(taskId: string): string {
  return `${API_BASE}/download/${taskId}`
}

/**
 * Polling задачи с интервалом. Вызывает callback при каждом обновлении.
 * Прекращает polling при статусах done/error или по timeout.
 */
export async function pollTaskStatus(
  taskId: string,
  onUpdate: (status: TaskStatusResponse) => void,
  intervalMs: number = 2000,
  timeoutMs: number = 300000, // 5 минут максимум
): Promise<TaskStatusResponse> {
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    const poll = async () => {
      // Проверяем timeout
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Превышено время ожидания (5 минут)'))
        return
      }

      try {
        const status = await getTaskStatus(taskId)
        onUpdate(status)

        if (status.status === 'done' || status.status === 'error') {
          resolve(status)
          return
        }

        // Продолжаем polling
        setTimeout(poll, intervalMs)
      } catch (error) {
        // При сетевой ошибке — повторяем, не прекращаем
        console.error('Ошибка polling:', error)
        setTimeout(poll, intervalMs * 2)
      }
    }

    poll()
  })
}

export { ApiError }
