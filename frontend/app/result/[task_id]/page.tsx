'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTaskStatus, getDownloadUrl, type TaskStatusResponse } from '@/lib/api'
import { RiskTable } from '@/components/risk-table'
import { getRiskColor, getRiskBadgeClass, getOverallRiskIcon, cn } from '@/lib/utils'

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.task_id as string

  const [task, setTask] = useState<TaskStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) return

    const fetchStatus = async () => {
      try {
        const status = await getTaskStatus(taskId)
        setTask(status)

        // Если всё ещё обрабатывается — продолжаем polling
        if (status.status === 'pending' || status.status === 'processing') {
          setTimeout(fetchStatus, 2000)
        }
      } catch (err) {
        setError('Не удалось загрузить результаты. Проверьте соединение.')
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [taskId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800">Загружаем результаты...</h2>
          <p className="text-slate-500 mt-2 text-sm">Если анализ ещё идёт — страница обновится автоматически</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-12 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">Ошибка</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  if (!task) return null

  // Задача ещё в обработке
  if (task.status === 'pending' || task.status === 'processing') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-blue-200 p-12 text-center">
          <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Анализируем договор</h2>
          <p className="text-slate-600 mb-2">
            {task.filename && <span className="font-medium">{task.filename}</span>}
          </p>
          <p className="text-slate-500 text-sm">Подождите 30–90 секунд. Страница обновляется автоматически.</p>

          <div className="mt-8 flex justify-center gap-8 text-sm text-slate-500">
            {['Извлечение текста', 'Поиск норм РБ', 'AI-анализ рисков'].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                </div>
                <span className="text-xs">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Ошибка задачи
  if (task.status === 'error') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-12 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">Ошибка анализа</h2>
          <p className="text-slate-600 mb-1">{task.filename}</p>
          {task.error_message && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-3 mb-6">
              {task.error_message}
            </p>
          )}
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  // Результаты готовы
  const result = task.result!

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Шапка с результатом */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className={cn(
          'px-6 py-5',
          result.overall_risk.toLowerCase() === 'высокий' && 'bg-gradient-to-r from-red-600 to-rose-700',
          result.overall_risk.toLowerCase() === 'средний' && 'bg-gradient-to-r from-amber-500 to-orange-600',
          result.overall_risk.toLowerCase() === 'низкий' && 'bg-gradient-to-r from-green-600 to-emerald-700',
        )}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{getOverallRiskIcon(result.overall_risk)}</span>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  {result.contract_type}
                </h1>
              </div>
              <p className="text-white/80 text-sm">
                {task.filename} · {task.created_at
                  ? new Date(task.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-white/70 text-xs uppercase tracking-wide mb-1">Общий риск</div>
                <div className="text-white font-bold text-2xl uppercase">{result.overall_risk}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Резюме */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Резюме анализа</h2>
          <p className="text-slate-800 leading-relaxed">{result.summary}</p>
        </div>

        {/* Счётчики рисков */}
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {[
            { label: 'Высокий риск', count: result.risks.filter(r => r.level.toLowerCase() === 'высокий').length, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Средний риск', count: result.risks.filter(r => r.level.toLowerCase() === 'средний').length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Низкий риск', count: result.risks.filter(r => r.level.toLowerCase() === 'низкий').length, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(item => (
            <div key={item.label} className={cn('px-6 py-4 text-center', item.bg)}>
              <div className={cn('text-3xl font-bold', item.color)}>{item.count}</div>
              <div className="text-xs text-slate-600 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Таблица рисков */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-5">
          Выявленные риски
          <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-sm font-normal">
            {result.risks.length}
          </span>
        </h2>
        <RiskTable risks={result.risks} />
      </div>

      {/* Отсутствующие условия */}
      {result.missing_clauses.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Отсутствующие условия
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-sm font-normal">
              {result.missing_clauses.length}
            </span>
          </h2>
          <div className="space-y-2">
            {result.missing_clauses.map((clause, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                <p className="text-sm text-slate-700">{clause}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вывод и кнопки действий */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Вывод</h2>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Необходима консультация юриста:</span>
              <span className={cn(
                'px-3 py-1 rounded-full text-sm font-bold',
                result.needs_lawyer
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-green-100 text-green-700 border border-green-300',
              )}>
                {result.needs_lawyer ? 'ДА' : 'НЕТ'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Подготовлено: LexAI.by</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {task.download_url && (
              <a
                href={getDownloadUrl(taskId)}
                download
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Скачать DOCX отчёт
              </a>
            )}
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Проверить другой договор
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
