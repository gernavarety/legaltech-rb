'use client'

import { useState } from 'react'
import { type RiskItem } from '@/lib/api'
import { getRiskBadgeClass, getRiskBg, cn } from '@/lib/utils'

interface RiskTableProps {
  risks: RiskItem[]
}

type FilterLevel = 'все' | 'высокий' | 'средний' | 'низкий'

export function RiskTable({ risks }: RiskTableProps) {
  const [filter, setFilter] = useState<FilterLevel>('все')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const filtered = filter === 'все' ? risks : risks.filter(r => r.level.toLowerCase() === filter)

  const counts = {
    высокий: risks.filter(r => r.level.toLowerCase() === 'высокий').length,
    средний: risks.filter(r => r.level.toLowerCase() === 'средний').length,
    низкий: risks.filter(r => r.level.toLowerCase() === 'низкий').length,
  }

  if (risks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-medium">Существенных рисков не выявлено</p>
      </div>
    )
  }

  return (
    <div>
      {/* Фильтры */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['все', 'высокий', 'средний', 'низкий'] as FilterLevel[]).map(level => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border',
              filter === level
                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400',
            )}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
            {level !== 'все' && counts[level as keyof typeof counts] > 0 && (
              <span className={cn(
                'ml-2 px-1.5 py-0.5 rounded-full text-xs',
                level === 'высокий' && 'bg-red-100 text-red-700',
                level === 'средний' && 'bg-yellow-100 text-yellow-700',
                level === 'низкий' && 'bg-green-100 text-green-700',
              )}>
                {counts[level as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-500 self-center">
          {filtered.length} из {risks.length} рисков
        </span>
      </div>

      {/* Таблица — мобильная версия (карточки) */}
      <div className="block md:hidden space-y-3">
        {filtered.map((risk, index) => (
          <div
            key={index}
            className={cn('rounded-xl border p-4 transition-all', getRiskBg(risk.level))}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getRiskBadgeClass(risk.level))}>
                {risk.level.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                {risk.law_reference}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-800 mb-2 italic">"{risk.clause}"</p>
            <p className="text-sm text-slate-700 mb-3">{risk.issue}</p>
            <div className="bg-white/70 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">Рекомендация:</p>
              <p className="text-sm text-slate-700">{risk.recommendation}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Таблица — десктоп */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-700 w-24">Уровень</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700 w-36">Норма РБ</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Проблема</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((risk, index) => (
              <>
                <tr
                  key={index}
                  onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                  className={cn(
                    'cursor-pointer hover:bg-slate-50 transition-colors',
                    getRiskBg(risk.level).replace('border-', 'border-l-4 border-l-'),
                    expandedRow === index && 'bg-slate-50',
                  )}
                >
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-1 rounded-md text-xs font-semibold', getRiskBadgeClass(risk.level))}>
                      {risk.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                      {risk.law_reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{risk.issue}</td>
                  <td className="px-4 py-3">
                    <svg
                      className={cn('w-4 h-4 text-slate-400 transition-transform', expandedRow === index && 'rotate-180')}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </td>
                </tr>
                {expandedRow === index && (
                  <tr key={`${index}-expanded`} className="bg-slate-50">
                    <td colSpan={4} className="px-4 py-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs font-semibold text-slate-500 mb-1">ПУНКТ ДОГОВОРА</p>
                          <p className="text-sm text-slate-700 italic">"{risk.clause}"</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs font-semibold text-slate-500 mb-1">РЕКОМЕНДАЦИЯ</p>
                          <p className="text-sm text-slate-700">{risk.recommendation}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
