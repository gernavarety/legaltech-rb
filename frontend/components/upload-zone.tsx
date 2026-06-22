'use client'

import { useState, useCallback, useRef } from 'react'
import { cn, formatFileSize } from '@/lib/utils'

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ACCEPTED_EXT = ['.pdf', '.docx']
const MAX_SIZE_MB = 10

export function UploadZone({ onFileSelect, disabled = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'docx'].includes(ext)) {
      return `Неподдерживаемый формат. Разрешены: PDF, DOCX`
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Файл слишком большой. Максимум ${MAX_SIZE_MB} МБ`
    }
    if (file.size < 100) {
      return 'Файл пустой или повреждён'
    }
    return null
  }

  const handleFile = useCallback((file: File) => {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setSelectedFile(file)
    onFileSelect(file)
  }, [onFileSelect])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [disabled, handleFile])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const openFilePicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div className="w-full">
      {/* Зона drag & drop */}
      <div
        onClick={openFilePicker}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'relative flex flex-col items-center justify-center w-full min-h-[280px] rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer group',
          isDragging
            ? 'border-blue-500 bg-blue-50 drop-zone-active scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50',
          disabled && 'opacity-50 cursor-not-allowed',
          selectedFile && !error && 'border-green-400 bg-green-50/50',
          error && 'border-red-400 bg-red-50/30',
        )}
      >
        {/* Иконка */}
        <div className={cn(
          'mb-4 w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-200',
          isDragging ? 'bg-blue-100 scale-110' : 'bg-slate-100 group-hover:bg-blue-100 group-hover:scale-105',
          selectedFile && !error && 'bg-green-100',
          error && 'bg-red-100',
        )}>
          {selectedFile && !error ? (
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : error ? (
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className={cn('w-10 h-10 transition-colors', isDragging ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>

        {/* Текст */}
        {selectedFile && !error ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-green-700">Файл готов к анализу</p>
            <p className="text-sm text-green-600 mt-1">{selectedFile.name}</p>
            <p className="text-xs text-slate-500 mt-1">{formatFileSize(selectedFile.size)}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFile(null)
                setError(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
              className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Выбрать другой файл
            </button>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-base font-medium text-red-600">{error}</p>
            <p className="text-sm text-slate-500 mt-2">Нажмите чтобы выбрать другой файл</p>
          </div>
        ) : (
          <div className="text-center px-8">
            <p className={cn('text-xl font-semibold transition-colors', isDragging ? 'text-blue-700' : 'text-slate-700')}>
              {isDragging ? 'Отпустите файл' : 'Перетащите договор сюда'}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              или <span className="text-blue-600 font-medium">нажмите для выбора файла</span>
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 font-medium shadow-sm">
                <span className="text-red-500">📄</span> PDF
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 font-medium shadow-sm">
                <span className="text-blue-500">📝</span> DOCX
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 font-medium shadow-sm">
                <span className="text-slate-400">⬆️</span> до {MAX_SIZE_MB} МБ
              </span>
            </div>
          </div>
        )}

        {/* Скрытый input */}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={onInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
