"use client"

/**
 * Каталог шаблонов документов — /generate
 * Фильтрация по группам, карточки шаблонов, переход к форме.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  FileText, Briefcase, Users, Scale, MessageSquare,
  ChevronRight, Lock, Building2, Truck, Package,
  ClipboardList, UserCheck, BookOpen, Shield,
} from "lucide-react"
import { getTemplates, getTemplateGroups, TemplateInfo } from "@/lib/api"

// Иконки по группам
const GROUP_ICONS: Record<string, React.ElementType> = {
  "Договоры": FileText,
  "Трудовые документы": Briefcase,
  "Корпоративные документы": Building2,
  "Претензии": MessageSquare,
}

// Иконки по slug шаблона
const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  sale_purchase_agreement: Package,
  lease_premises: Building2,
  lease_vehicle: Truck,
  supply_agreement: Truck,
  contractor_agreement: ClipboardList,
  services_agreement: UserCheck,
  loan_agreement: Scale,
  storage_agreement: Shield,
  commission_agreement: Briefcase,
  cargo_transport: Truck,
  employment_contract: Briefcase,
  employment_addendum: FileText,
  liability_agreement: Shield,
  job_description: BookOpen,
  llc_charter: Building2,
  meeting_protocol: Users,
  sole_participant_decision: UserCheck,
  power_of_attorney: Scale,
  claim_letter: MessageSquare,
  claim_response: MessageSquare,
}

const PLAN_BADGE: Record<string, string> = {
  solo: "Solo+",
  firm: "Firm",
}

// Цвета группы
const GROUP_COLORS: Record<string, string> = {
  "Договоры": "blue",
  "Трудовые документы": "emerald",
  "Корпоративные документы": "violet",
  "Претензии": "orange",
}

export default function GeneratePage() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [activeGroup, setActiveGroup] = useState<string>("Все")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTemplates(), getTemplateGroups()])
      .then(([tmpl, grps]) => {
        setTemplates(tmpl)
        setGroups(["Все", ...grps])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeGroup === "Все"
    ? templates
    : templates.filter((t) => t.group_name === activeGroup)

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Шапка */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Генератор документов
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            20 шаблонов юридических документов по праву Республики Беларусь.
            AI составит готовый документ на основе ваших данных за 30–60 секунд.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Фильтр по группам */}
        <div className="mb-8 flex flex-wrap gap-2">
          {groups.map((group) => {
            const Icon = GROUP_ICONS[group] ?? FileText
            const isActive = activeGroup === group
            return (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                } border border-transparent ${
                  isActive ? "" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {group !== "Все" && <Icon className="h-4 w-4" />}
                {group}
              </button>
            )
          })}
        </div>

        {/* Сетка шаблонов */}
        {loading ? (
          <TemplateSkeleton />
        ) : (
          <>
            {activeGroup !== "Все" && (
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {filtered.length} {plural(filtered.length, "шаблон", "шаблона", "шаблонов")}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((tmpl) => (
                <TemplateCard key={tmpl.slug} template={tmpl} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function TemplateCard({ template }: { template: TemplateInfo }) {
  const Icon = TEMPLATE_ICONS[template.slug] ?? FileText
  const color = GROUP_COLORS[template.group_name] ?? "blue"
  const isPaidOnly = !template.available_plans.includes("free")

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  }

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600">
      {/* Бейдж платного тарифа */}
      {isPaidOnly && (
        <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <Lock className="h-2.5 w-2.5" />
          {template.available_plans[0] === "solo" ? "Solo+" : "Firm"}
        </span>
      )}

      {/* Иконка */}
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Название и описание */}
      <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
        {template.name}
      </h3>
      <p className="mb-4 flex-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
        {template.description}
      </p>

      {/* Правовые ссылки */}
      {template.law_references.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {template.law_references.slice(0, 3).map((ref) => (
            <span
              key={ref}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {ref}
            </span>
          ))}
          {template.law_references.length > 3 && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
              +{template.law_references.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Кнопка */}
      <Link
        href={`/generate/${template.slug}`}
        className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 group-hover:bg-blue-700"
      >
        Создать документ
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function TemplateSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mb-4 h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <div className="mb-4 h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  )
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`
  return `${n} ${many}`
}
