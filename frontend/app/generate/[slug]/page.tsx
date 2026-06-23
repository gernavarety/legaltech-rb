"use client"

/**
 * Форма генерации конкретного документа — /generate/[slug]
 * Двухколоночный макет: форма (60%) + информационная панель (40%).
 */

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight, Scale, Clock, AlertTriangle, BookOpen, CheckCircle
} from "lucide-react"
import { getTemplateDetail, startGeneration, TemplateDetail } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { DocumentForm } from "@/components/document-form"

export default function GenerateSlugPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { getAccessToken, user } = useAuth()

  const [template, setTemplate] = useState<TemplateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.slug) return
    getTemplateDetail(params.slug)
      .then(setTemplate)
      .catch((e) => setError(e.message ?? "Шаблон не найден"))
      .finally(() => setLoading(false))
  }, [params.slug])

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!user) {
      router.push(`/login?redirect=/generate/${params.slug}`)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const result = await startGeneration(params.slug, data, token)
      router.push(`/generate/${params.slug}/result/${result.task_id}`)
    } catch (err: unknown) {
      const msg = (err as { detail?: { message?: string }; message?: string })
      const text = msg?.detail?.message ?? msg?.message ?? "Ошибка при создании документа"
      setError(text)
      throw new Error(text)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageSkeleton />

  if (!template || error) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error ?? "Шаблон не найден"}
          </h2>
          <Link href="/generate" className="text-blue-600 hover:underline">
            ← Вернуться к каталогу
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Шапка с хлебными крошками */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/generate" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Генератор документов
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 dark:text-white font-medium">{template.name}</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {template.name}
          </h1>
          {template.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              {template.description}
            </p>
          )}
        </div>
      </div>

      {/* Основной контент */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

          {/* Левая колонка — форма (3/5) */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
                Заполните данные документа
              </h2>

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                    {error.includes("лимит") && (
                      <Link href="/pricing" className="mt-1 text-sm text-red-600 underline dark:text-red-400">
                        Перейти к тарифам →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {!user && (
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Для создания документа необходимо{" "}
                    <Link
                      href={`/login?redirect=/generate/${params.slug}`}
                      className="font-semibold underline"
                    >
                      войти в аккаунт
                    </Link>
                    .
                  </p>
                </div>
              )}

              <DocumentForm
                fields={template.fields_schema.fields}
                templateName={template.name}
                onSubmit={handleSubmit}
                isLoading={submitting}
              />
            </div>
          </div>

          {/* Правая колонка — информация (2/5) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Правовая база */}
            {template.law_references.length > 0 && (
              <InfoCard
                icon={<Scale className="h-5 w-5 text-blue-500" />}
                title="Правовая база"
              >
                <ul className="space-y-1.5">
                  {template.law_references.map((ref) => (
                    <li key={ref} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
                      {ref}
                    </li>
                  ))}
                </ul>
              </InfoCard>
            )}

            {/* Что включено */}
            <InfoCard
              icon={<BookOpen className="h-5 w-5 text-emerald-500" />}
              title="Что включает документ"
            >
              <ul className="space-y-1.5">
                {getDocumentIncludes(template.slug).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </InfoCard>

            {/* Время генерации */}
            <InfoCard
              icon={<Clock className="h-5 w-5 text-violet-500" />}
              title="Время создания"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Обычно <span className="font-semibold text-violet-600 dark:text-violet-400">30–60 секунд</span>.
                Документ создаётся с помощью AI на основе введённых вами данных
                и норм права РБ из нашей базы.
              </p>
            </InfoCard>

            {/* Предупреждение */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Документ является шаблоном
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Рекомендуем проверку квалифицированным юристом перед подписанием.
                    Результат не является официальной юридической консультацией.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function PageSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-7 w-80 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 animate-pulse space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="mb-1.5 h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-32 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    </main>
  )
}

// Статические описания содержимого документов
function getDocumentIncludes(slug: string): string[] {
  const map: Record<string, string[]> = {
    sale_purchase_agreement: ["Предмет договора и описание товара", "Цена и порядок оплаты", "Условия поставки", "Гарантийные обязательства", "Ответственность сторон", "Реквизиты и подписи"],
    lease_premises: ["Описание и характеристики помещения", "Размер арендной платы", "Порядок и сроки оплаты", "Условия использования и ремонта", "Права и обязанности сторон", "Реквизиты и подписи"],
    lease_vehicle: ["Описание и характеристики ТС", "Условия аренды и оплаты", "Распределение расходов на ГСМ и страховку", "Ответственность за ущерб", "Реквизиты и подписи"],
    supply_agreement: ["Спецификация товара", "График поставок", "Порядок оплаты и отсрочки", "Условия приёмки по качеству", "Ответственность и неустойки", "Реквизиты и подписи"],
    contractor_agreement: ["Описание и объём работ", "Сроки выполнения", "Стоимость и порядок оплаты", "Материалы и оборудование", "Гарантийные обязательства", "Акт приёмки работ"],
    services_agreement: ["Описание оказываемых услуг", "Стоимость и периодичность оплаты", "Порядок подтверждения услуг", "Конфиденциальность", "Ответственность сторон", "Реквизиты"],
    loan_agreement: ["Сумма и цель займа", "Процентная ставка (или беспроцентность)", "График погашения", "Ответственность за просрочку", "Реквизиты и подписи"],
    storage_agreement: ["Описание имущества и его стоимость", "Условия хранения", "Стоимость услуг хранения", "Ответственность хранителя", "Порядок выдачи имущества"],
    commission_agreement: ["Предмет комиссии", "Размер вознаграждения", "Порядок отчётности", "Сроки перечисления выручки", "Права и обязанности комиссионера"],
    cargo_transport: ["Описание груза", "Маршрут и сроки доставки", "Стоимость перевозки", "Ответственность за утрату груза", "Условия погрузки/разгрузки"],
    employment_contract: ["Должность и подразделение", "Режим рабочего времени", "Оклад и надбавки", "Отпуск и социальные гарантии", "Условия расторжения контракта"],
    employment_addendum: ["Изменяемые условия трудового договора", "Обоснование изменений", "Дата вступления в силу", "Подписи сторон"],
    liability_agreement: ["Перечень вверяемых ценностей", "Обязанности материально-ответственного", "Порядок инвентаризации", "Ответственность за недостачу"],
    job_description: ["Квалификационные требования", "Должностные обязанности", "Права работника", "Ответственность", "Порядок утверждения"],
    llc_charter: ["Наименование и адрес общества", "Состав участников и доли", "Уставный фонд", "Органы управления", "Порядок распределения прибыли", "Реорганизация и ликвидация"],
    meeting_protocol: ["Состав участников и кворум", "Повестка дня", "Принятые решения", "Результаты голосования", "Подписи председателя и секретаря"],
    sole_participant_decision: ["Единственный участник и его полномочия", "Предмет решения", "Принятое решение", "Дата и подпись"],
    power_of_attorney: ["Данные доверителя и представителя", "Перечень предоставляемых полномочий", "Срок действия доверенности", "Право передоверия"],
    claim_letter: ["Ссылка на нарушенный договор", "Описание нарушения", "Расчёт суммы требований", "Срок для ответа", "Последствия неисполнения"],
    claim_response: ["Позиция по претензии", "Обоснование признания/отклонения", "Предложение по урегулированию", "Подпись уполномоченного лица"],
  }
  return map[slug] ?? ["Все существенные условия по ГК РБ", "Реквизиты сторон", "Места для подписей"]
}
