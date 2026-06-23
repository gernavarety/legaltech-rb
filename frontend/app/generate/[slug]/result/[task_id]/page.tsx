"use client"

/**
 * Страница результата генерации — /generate/[slug]/result/[task_id]
 * Polling статуса каждые 2 сек, показ превью и кнопок скачивания.
 */

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle, XCircle, Loader2, Download, FileText,
  RotateCcw, ShieldCheck, Eye, EyeOff, ExternalLink,
} from "lucide-react"
import {
  getGenerationStatus,
  downloadGeneration,
  GenerationStatus,
} from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

const POLL_INTERVAL = 2500 // мс

export default function GenerationResultPage() {
  const params = useParams<{ slug: string; task_id: string }>()
  const { getAccessToken } = useAuth()
  const router = useRouter()

  const [status, setStatus] = useState<GenerationStatus | null>(null)
  const [showFull, setShowFull] = useState(false)
  const [downloading, setDownloading] = useState<"docx" | "pdf" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const data = await getGenerationStatus(params.task_id, token)
      setStatus(data)
      return data.status
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Ошибка загрузки статуса"
      setError(msg)
      return "error"
    }
  }, [params.task_id, getAccessToken])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      const st = await fetchStatus()
      if (st === "pending" || st === "processing") {
        timer = setTimeout(poll, POLL_INTERVAL)
      }
    }

    poll()
    return () => clearTimeout(timer)
  }, [fetchStatus])

  const handleDownload = async (format: "docx" | "pdf") => {
    setDownloading(format)
    try {
      const token = await getAccessToken()
      const { download_url } = await downloadGeneration(params.task_id, format, token)
      // Открываем presigned URL в новой вкладке
      window.open(download_url, "_blank", "noopener")
    } catch (err: unknown) {
      const msg = (err as { detail?: { message?: string }; message?: string })
      alert(msg?.detail?.message ?? msg?.message ?? "Ошибка скачивания")
    } finally {
      setDownloading(null)
    }
  }

  // ── Рендеринг по статусу ──────────────────────────────────────

  if (error) {
    return <ErrorState message={error} slug={params.slug} />
  }

  if (!status || status.status === "pending" || status.status === "processing") {
    return <LoadingState status={status?.status} templateName={status?.template_name} />
  }

  if (status.status === "error") {
    return (
      <ErrorState
        message={status.error_text ?? "Не удалось создать документ. Попробуйте снова."}
        slug={params.slug}
      />
    )
  }

  // status === "done"
  const previewText = status.preview_text ?? ""
  const isTruncated = previewText.length >= 790

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Шапка успеха */}
      <div className="border-b border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="h-10 w-10 shrink-0 text-emerald-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Документ создан
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {status.template_name} · {formatDate(status.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">

        {/* Кнопки скачивания */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleDownload("docx")}
            disabled={downloading === "docx"}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {downloading === "docx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Скачать DOCX
          </button>

          {status.download_url_pdf ? (
            <button
              onClick={() => handleDownload("pdf")}
              disabled={downloading === "pdf"}
              className="flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 disabled:opacity-60 transition-colors dark:border-blue-700 dark:bg-gray-900 dark:text-blue-400 dark:hover:bg-gray-800"
            >
              {downloading === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Скачать PDF
            </button>
          ) : (
            <Link
              href="/pricing"
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            >
              <ExternalLink className="h-4 w-4" />
              PDF — Solo/Firm
            </Link>
          )}
        </div>

        {/* Предпросмотр текста */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText className="h-4 w-4 text-blue-500" />
              Предпросмотр документа
            </div>
            {isTruncated && (
              <button
                onClick={() => setShowFull(!showFull)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showFull ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showFull ? "Скрыть" : "Показать больше"}
              </button>
            )}
          </div>

          <div className="relative px-6 py-5">
            <pre className={`whitespace-pre-wrap font-mono text-xs text-gray-800 dark:text-gray-300 leading-relaxed transition-all ${!showFull && isTruncated ? "max-h-64 overflow-hidden" : ""}`}>
              {previewText}
            </pre>

            {/* Размытие для усечённого текста */}
            {!showFull && isTruncated && (
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent dark:from-gray-900 pointer-events-none" />
            )}
          </div>

          {isTruncated && (
            <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Показаны первые 800 символов. Скачайте документ для полного текста.
              </p>
            </div>
          )}
        </div>

        {/* Действия после создания */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ActionCard
            icon={<ShieldCheck className="h-6 w-6 text-amber-500" />}
            title="Проверить риски"
            description="Загрузите созданный документ в анализатор для проверки юридических рисков"
            href="/"
            label="Проверить документ"
            variant="secondary"
          />
          <ActionCard
            icon={<RotateCcw className="h-6 w-6 text-blue-500" />}
            title="Создать ещё один"
            description={`Вернуться к форме и создать ещё один экземпляр ${status.template_name ?? "документа"}`}
            href={`/generate/${params.slug}`}
            label="Создать снова"
            variant="secondary"
          />
        </div>

        {/* Ссылка на историю */}
        <div className="text-center">
          <Link
            href="/history"
            className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          >
            Перейти в историю документов →
          </Link>
        </div>
      </div>
    </main>
  )
}

// ── Вспомогательные компоненты ────────────────────────────────

function LoadingState({ status, templateName }: { status?: string; templateName?: string | null }) {
  const steps = [
    { label: "Анализируем параметры документа", done: true },
    { label: "Ищем нормы права РБ", done: status === "processing" },
    { label: "Claude составляет документ", done: false },
    { label: "Форматируем DOCX", done: false },
  ]

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="mx-auto max-w-md w-full px-4 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Создаём {templateName ?? "документ"}...
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Обычно занимает 30–60 секунд
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 text-left space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : i === steps.findIndex(s => !s.done) ? (
                <Loader2 className="h-4 w-4 shrink-0 text-blue-500 animate-spin" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
              <span className={`text-sm ${step.done ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Прогресс-бар анимация */}
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-full w-1/3 animate-progress rounded-full bg-blue-500" />
        </div>
      </div>
    </main>
  )
}

function ErrorState({ message, slug }: { message: string; slug: string }) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="mx-auto max-w-md w-full px-4 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Ошибка генерации
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/generate/${slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <RotateCcw className="h-4 w-4" />
            Попробовать снова
          </Link>
          <Link href="/generate" className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400">
            ← К каталогу шаблонов
          </Link>
        </div>
      </div>
    </main>
  )
}

function ActionCard({
  icon, title, description, href, label, variant,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  label: string
  variant: "primary" | "secondary"
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
          variant === "primary"
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        }`}
      >
        {label}
      </Link>
    </div>
  )
}

function formatDate(isoStr: string | null): string {
  if (!isoStr) return ""
  try {
    return new Date(isoStr).toLocaleDateString("ru-RU", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return ""
  }
}
