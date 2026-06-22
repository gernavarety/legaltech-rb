'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UploadZone } from '@/components/upload-zone'
import { ProgressSteps } from '@/components/progress-steps'
import { uploadContract, pollTaskStatus, type TaskStatusResponse, ApiError } from '@/lib/api'

type PageState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function HomePage() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setPageState('idle')
    setErrorMessage(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) return

    setPageState('uploading')
    setErrorMessage(null)

    try {
      // Загружаем файл
      const uploadResp = await uploadContract(selectedFile)
      const taskId = uploadResp.task_id

      setPageState('processing')
      setTaskStatus({ task_id: taskId, status: 'processing' })

      // Polling статуса каждые 2 секунды
      const finalStatus = await pollTaskStatus(
        taskId,
        (status) => {
          setTaskStatus(status)
        },
        2000,
        300000,
      )

      if (finalStatus.status === 'done') {
        setPageState('done')
        // Переходим на страницу результатов
        setTimeout(() => {
          router.push(`/result/${taskId}`)
        }, 800)
      } else if (finalStatus.status === 'error') {
        setPageState('error')
        setErrorMessage(finalStatus.error_message || 'Неизвестная ошибка при анализе')
      }

    } catch (err) {
      setPageState('error')
      if (err instanceof ApiError) {
        setErrorMessage(err.detail || err.message)
      } else if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Произошла неизвестная ошибка')
      }
    }
  }, [selectedFile, router])

  const handleReset = () => {
    setPageState('idle')
    setSelectedFile(null)
    setTaskStatus(null)
    setErrorMessage(null)
  }

  const isProcessing = pageState === 'uploading' || pageState === 'processing'
  const taskPollStatus = taskStatus?.status ?? (pageState === 'uploading' ? 'pending' : 'pending')

  return (
    <div className="max-w-3xl mx-auto">
      {/* Герой-секция */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 font-medium mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Работает на Claude AI · Право Республики Беларусь
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
          Проверка договора
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> за 60 секунд</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          Загрузите PDF или DOCX — AI выявит риски и нарушения норм ГК РБ, ТК РБ, ХПК РБ с конкретными ссылками на статьи.
        </p>
      </div>

      {/* Блок с формой или прогрессом */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
        {/* Верхняя панель */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            {isProcessing ? 'Анализируем ваш договор...' :
             pageState === 'done' ? 'Анализ завершён! Переходим к результатам...' :
             pageState === 'error' ? 'Ошибка анализа' :
             'Загрузите договор для анализа'}
          </h2>
          <p className="text-blue-200 text-sm mt-0.5">
            {isProcessing
              ? 'Подождите, это займёт 30–90 секунд'
              : 'Поддерживаются форматы PDF и DOCX (до 10 МБ)'}
          </p>
        </div>

        <div className="p-6 md:p-8">
          {/* Состояние: ожидание загрузки */}
          {(pageState === 'idle' || pageState === 'error') && !isProcessing && (
            <div className="space-y-6">
              <UploadZone
                onFileSelect={handleFileSelect}
                disabled={isProcessing}
              />

              {/* Ошибка */}
              {errorMessage && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Ошибка</p>
                    <p className="text-sm text-red-700 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Кнопка отправки */}
              <button
                onClick={handleSubmit}
                disabled={!selectedFile || isProcessing}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                {selectedFile ? `Проверить договор →` : 'Выберите файл'}
              </button>

              {/* Что анализируем */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: '⚖️', title: 'ГК РБ', desc: 'Гражданский кодекс' },
                  { icon: '👷', title: 'ТК РБ', desc: 'Трудовой кодекс' },
                  { icon: '🏛️', title: 'ХПК РБ', desc: 'Хозяйственный кодекс' },
                ].map(item => (
                  <div key={item.title} className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-xs font-bold text-slate-700">{item.title}</div>
                    <div className="text-xs text-slate-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Состояние: обработка */}
          {isProcessing && (
            <ProgressSteps
              status={taskPollStatus as 'pending' | 'processing' | 'done' | 'error'}
            />
          )}

          {/* Состояние: готово */}
          {pageState === 'done' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Анализ готов!</h3>
              <p className="text-slate-600">Переходим к результатам...</p>
              <div className="mt-4 flex justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Как это работает */}
      <div className="mt-12 grid md:grid-cols-4 gap-4">
        {[
          { step: '1', icon: '📤', title: 'Загрузка', desc: 'Загружаете PDF или DOCX договора' },
          { step: '2', icon: '🔍', title: 'Поиск норм', desc: 'Ищем релевантные статьи НПА РБ' },
          { step: '3', icon: '🤖', title: 'AI-анализ', desc: 'Claude выявляет риски и нарушения' },
          { step: '4', icon: '📋', title: 'Отчёт', desc: 'Скачиваете DOCX с рекомендациями' },
        ].map(item => (
          <div key={item.step} className="relative bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
            <div className="absolute -top-3 -left-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {item.step}
            </div>
            <div className="text-3xl mb-2">{item.icon}</div>
            <h3 className="font-semibold text-slate-800 text-sm mb-1">{item.title}</h3>
            <p className="text-xs text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
