import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function getRiskColor(level: string): string {
  const l = level.toLowerCase()
  if (l === 'высокий') return 'text-red-600'
  if (l === 'средний') return 'text-yellow-600'
  if (l === 'низкий') return 'text-green-600'
  return 'text-gray-600'
}

export function getRiskBg(level: string): string {
  const l = level.toLowerCase()
  if (l === 'высокий') return 'bg-red-50 border-red-200'
  if (l === 'средний') return 'bg-yellow-50 border-yellow-200'
  if (l === 'низкий') return 'bg-green-50 border-green-200'
  return 'bg-gray-50 border-gray-200'
}

export function getRiskBadgeClass(level: string): string {
  const l = level.toLowerCase()
  if (l === 'высокий') return 'bg-red-100 text-red-800 border border-red-300'
  if (l === 'средний') return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
  if (l === 'низкий') return 'bg-green-100 text-green-800 border border-green-300'
  return 'bg-gray-100 text-gray-800'
}

export function getOverallRiskIcon(level: string): string {
  const l = level.toLowerCase()
  if (l === 'высокий') return '🔴'
  if (l === 'средний') return '🟡'
  if (l === 'низкий') return '🟢'
  return '⚪'
}
