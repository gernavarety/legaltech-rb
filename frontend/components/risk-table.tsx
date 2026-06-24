"use client";

import { useState } from "react";
import { type RiskItem } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RiskTableProps {
  risks: RiskItem[];
}

type FilterLevel = "все" | "высокий" | "средний" | "низкий";

function levelStyle(level: string) {
  const l = level.toLowerCase();
  if (l === "высокий") return { dot: "#FF4D6D", badge: { color: "#FF4D6D", background: "rgba(255,77,109,0.12)", border: "rgba(255,77,109,0.25)" }, row: "rgba(255,77,109,0.04)", leftBorder: "#FF4D6D" };
  if (l === "средний") return { dot: "#FF9F0A", badge: { color: "#FF9F0A", background: "rgba(255,159,10,0.12)", border: "rgba(255,159,10,0.25)" }, row: "rgba(255,159,10,0.03)", leftBorder: "#FF9F0A" };
  return { dot: "#00E5CC", badge: { color: "#00E5CC", background: "rgba(0,229,204,0.08)", border: "rgba(0,229,204,0.2)" }, row: "rgba(0,229,204,0.02)", leftBorder: "#00E5CC" };
}

export function RiskTable({ risks }: RiskTableProps) {
  const [filter, setFilter] = useState<FilterLevel>("все");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const filtered = filter === "все" ? risks : risks.filter((r) => r.level.toLowerCase() === filter);

  const counts = {
    высокий: risks.filter((r) => r.level.toLowerCase() === "высокий").length,
    средний: risks.filter((r) => r.level.toLowerCase() === "средний").length,
    низкий: risks.filter((r) => r.level.toLowerCase() === "низкий").length,
  };

  if (risks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-medium text-white/60">Существенных рисков не выявлено</p>
      </div>
    );
  }

  return (
    <div>
      {/* Фильтры */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["все", "высокий", "средний", "низкий"] as FilterLevel[]).map((level) => {
          const active = filter === level;
          const badgeBg = level === "высокий" ? "rgba(255,77,109,0.15)" : level === "средний" ? "rgba(255,159,10,0.15)" : "rgba(0,229,204,0.1)";
          const badgeColor = level === "высокий" ? "#FF4D6D" : level === "средний" ? "#FF9F0A" : "#00E5CC";
          return (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 border"
              style={{
                background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                borderColor: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
                color: active ? "white" : "rgba(255,255,255,0.45)",
              }}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
              {level !== "все" && counts[level as keyof typeof counts] > 0 && (
                <span
                  className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold"
                  style={{ background: badgeBg, color: badgeColor }}
                >
                  {counts[level as keyof typeof counts]}
                </span>
              )}
            </button>
          );
        })}
        <span className="ml-auto text-white/25 text-sm self-center">
          {filtered.length} из {risks.length}
        </span>
      </div>

      {/* Мобильные карточки */}
      <div className="block md:hidden space-y-3">
        {filtered.map((risk, i) => {
          const s = levelStyle(risk.level);
          return (
            <div
              key={i}
              className="rounded-xl border p-4"
              style={{ background: s.row, borderColor: s.badge.border, borderLeftWidth: 3, borderLeftColor: s.leftBorder }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: s.badge.background, color: s.badge.color, border: `1px solid ${s.badge.border}` }}
                >
                  {risk.level.toUpperCase()}
                </span>
                <span
                  className="text-xs font-mono px-2 py-1 rounded"
                  style={{ background: "rgba(0,229,204,0.08)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.15)" }}
                >
                  {risk.law_reference}
                </span>
              </div>
              <p className="text-white/65 text-sm italic mb-2">"{risk.clause}"</p>
              <p className="text-white/75 text-sm mb-3">{risk.issue}</p>
              <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-1">Рекомендация:</p>
                <p className="text-white/65 text-sm">{risk.recommendation}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Десктоп-таблица */}
      <div className="hidden md:block overflow-x-auto rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="text-left px-4 py-3 font-medium text-white/35 text-xs uppercase tracking-wider w-28">Уровень</th>
              <th className="text-left px-4 py-3 font-medium text-white/35 text-xs uppercase tracking-wider w-36">Норма РБ</th>
              <th className="text-left px-4 py-3 font-medium text-white/35 text-xs uppercase tracking-wider">Проблема</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((risk, index) => {
              const s = levelStyle(risk.level);
              const expanded = expandedRow === index;
              return (
                <>
                  <tr
                    key={index}
                    onClick={() => setExpandedRow(expanded ? null : index)}
                    className="cursor-pointer transition-colors"
                    style={{
                      background: expanded ? "rgba(255,255,255,0.03)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      borderLeft: `3px solid ${s.leftBorder}`,
                    }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: s.badge.background, color: s.badge.color }}
                      >
                        {risk.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-mono px-2 py-1 rounded"
                        style={{ background: "rgba(0,229,204,0.07)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.15)" }}
                      >
                        {risk.law_reference}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">{risk.issue}</td>
                    <td className="px-4 py-3">
                      <svg
                        className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")}
                        style={{ color: "rgba(255,255,255,0.25)" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${index}-expanded`} style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td colSpan={4} className="px-4 py-4">
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-1.5">Пункт договора</p>
                            <p className="text-white/60 text-sm italic">"{risk.clause}"</p>
                          </div>
                          <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-1.5">Рекомендация</p>
                            <p className="text-white/70 text-sm">{risk.recommendation}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
