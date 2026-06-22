'use client'

import { cn } from '@/lib/utils'

export type StepStatus = 'waiting' | 'active' | 'done' | 'error'

export interface Step {
  id: string
  label: string
  description: string
}

const STEPS: Step[] = [
  {
    id: 'upload',
    label: 'Загрузка',
    description: 'Файл загружается на сервер',
  },
  {
    id: 'extract',
    label: 'Извлечение текста',
    description: 'Читаем содержимое документа',
  },
  {
    id: 'search',
    label: 'Поиск норм РБ',
    description: 'Находим релевантные статьи закона',
  },
  {
    id: 'analyze',
    label: 'AI-анализ',
    description: 'Claude анализирует риски договора',
  },
  {
    id: 'report',
    label: 'Генерация отчёта',
    description: 'Формируем DOCX-отчёт',
  },
]

interface ProgressStepsProps {
  status: 'pending' | 'processing' | 'done' | 'error'
  startedAt?: Date
}

function getStepStatuses(status: ProgressStepsProps['status']): StepStatus[] {
  if (status === 'pending') {
    return ['active', 'waiting', 'waiting', 'waiting', 'waiting']
  }
  if (status === 'processing') {
    // В реальности мы не знаем точный шаг, анимируем прогрессивно
    return ['done', 'done', 'active', 'waiting', 'waiting']
  }
  if (status === 'done') {
    return ['done', 'done', 'done', 'done', 'done']
  }
  if (status === 'error') {
    return ['done', 'done', 'error', 'waiting', 'waiting']
  }
  return ['waiting', 'waiting', 'waiting', 'waiting', 'waiting']
}

export function ProgressSteps({ status, startedAt }: ProgressStepsProps) {
  const stepStatuses = getStepStatuses(status)

  return (
    <div className="w-full">
      {/* Общий прогресс-бар */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">
            {status === 'pending' && 'Подготовка...'}
            {status === 'processing' && 'Анализируем договор...'}
            {status === 'done' && 'Анализ завершён!'}
            {status === 'error' && 'Произошла ошибка'}
          </span>
          <span className="text-sm text-slate-500">
            {status === 'done' ? '100%' : status === 'processing' ? '50%' : status === 'pending' ? '10%' : ''}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000',
              status === 'pending' && 'w-[10%] bg-blue-400',
              status === 'processing' && 'w-[60%] bg-blue-500 animate-pulse',
              status === 'done' && 'w-full bg-green-500',
              status === 'error' && 'w-[40%] bg-red-400',
            )}
          />
        </div>
      </div>

      {/* Шаги */}
      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const stepStatus = stepStatuses[index]
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all duration-300',
                stepStatus === 'done' && 'bg-green-50 border-green-200',
                stepStatus === 'active' && 'bg-blue-50 border-blue-300 shadow-sm',
                stepStatus === 'waiting' && 'bg-slate-50 border-slate-200 opacity-50',
                stepStatus === 'error' && 'bg-red-50 border-red-200',
              )}
            >
              {/* Иконка статуса */}
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                stepStatus === 'done' && 'bg-green-100',
                stepStatus === 'active' && 'bg-blue-100',
                stepStatus === 'waiting' && 'bg-slate-200',
                stepStatus === 'error' && 'bg-red-100',
              )}>
                {stepStatus === 'done' && (
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {stepStatus === 'active' && (
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                )}
                {stepStatus === 'waiting' && (
                  <span className="text-xs font-medium text-slate-500">{index + 1}</span>
                )}
                {stepStatus === 'error' && (
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              {/* Текст */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-semibold',
                  stepStatus === 'done' && 'text-green-700',
                  stepStatus === 'active' && 'text-blue-700',
                  stepStatus === 'waiting' && 'text-slate-500',
                  stepStatus === 'error' && 'text-red-600',
                )}>
                  {step.label}
                </p>
                {stepStatus === 'active' && (
                  <p className="text-xs text-blue-600 mt-0.5">{step.description}</p>
                )}
              </div>

              {/* Метка "Готово" */}
              {stepStatus === 'done' && (
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  Готово
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Подсказка */}
      {(status === 'pending' || status === 'processing') && (
        <p className="text-center text-xs text-slate-400 mt-6">
          Анализ занимает 30–90 секунд. Не закрывайте страницу.
        </p>
      )}
    </div>
  )
}
