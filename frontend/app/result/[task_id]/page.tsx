"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getTaskStatus, getDownloadUrl, type TaskStatus } from "@/lib/api";
import { RiskTable } from "@/components/risk-table";

const CARD = { background: "#0F1422", borderColor: "rgba(255,255,255,0.07)" };

function riskColors(level: string) {
  const l = level.toLowerCase();
  if (l === "высокий") return { dot: "#FF4D6D", bg: "rgba(255,77,109,0.08)", border: "rgba(255,77,109,0.25)", text: "#FF4D6D", label: "Высокий" };
  if (l === "средний") return { dot: "#FF9F0A", bg: "rgba(255,159,10,0.08)", border: "rgba(255,159,10,0.25)", text: "#FF9F0A", label: "Средний" };
  return { dot: "#00E5CC", bg: "rgba(0,229,204,0.06)", border: "rgba(0,229,204,0.2)", text: "#00E5CC", label: "Низкий" };
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.task_id as string;

  const [task, setTask] = useState<TaskStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        const status = await getTaskStatus(taskId, null);
        setTask(status);
        if (status.status === "pending" || status.status === "processing") {
          setTimeout(poll, 2000);
        }
      } catch {
        setError("Не удалось загрузить результаты. Проверьте соединение.");
      } finally {
        setLoading(false);
      }
    };

    poll();
  }, [taskId]);

  // ── loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-2 border-[#00E5CC] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
        <h2 className="text-xl font-semibold text-white">Загружаем результаты...</h2>
        <p className="text-white/40 text-sm mt-2">Страница обновится автоматически</p>
      </div>
    );
  }

  // ── error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-3xl mb-5">❌</div>
        <h2 className="text-xl font-semibold text-white mb-2">Ошибка</h2>
        <p className="text-white/50 mb-7">{error}</p>
        <Link href="/analyze" className="px-7 py-3 bg-[#00E5CC] text-[#0A0C14] font-semibold rounded-xl hover:bg-[#00CDB8] transition-colors">
          Попробовать снова
        </Link>
      </div>
    );
  }

  if (!task) return null;

  // ── processing ───────────────────────────────────────────
  if (task.status === "pending" || task.status === "processing") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 border-2 border-[#00E5CC] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Анализируем договор
        </h2>
        {task.filename && <p className="text-white/50 text-sm mb-1">{task.filename}</p>}
        <p className="text-white/35 text-sm">Подождите 30–90 сек. Страница обновляется автоматически.</p>

        <div className="flex justify-center gap-6 mt-10">
          {["Извлечение текста", "Нормы РБ", "AI-анализ рисков"].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#00E5CC]/10 border border-[#00E5CC]/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#00E5CC] animate-pulse" />
              </div>
              <span className="text-white/35 text-xs">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── task error ───────────────────────────────────────────
  if (task.status === "error") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-3xl mb-5">⚠️</div>
        <h2 className="text-xl font-semibold text-white mb-1">Ошибка анализа</h2>
        {task.filename && <p className="text-white/50 text-sm mb-4">{task.filename}</p>}
        {task.error_message && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-7 text-left max-w-md mx-auto">
            {task.error_message}
          </p>
        )}
        <Link href="/analyze" className="px-7 py-3 bg-[#00E5CC] text-[#0A0C14] font-semibold rounded-xl hover:bg-[#00CDB8] transition-colors">
          Загрузить другой договор
        </Link>
      </div>
    );
  }

  // ── done ─────────────────────────────────────────────────
  const result = task.result!;
  const rc = riskColors(result.overall_risk);

  const highCount = result.risks.filter((r) => r.level.toLowerCase() === "высокий").length;
  const medCount = result.risks.filter((r) => r.level.toLowerCase() === "средний").length;
  const lowCount = result.risks.filter((r) => r.level.toLowerCase() === "низкий").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      {/* ── Шапка ─────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={CARD}>
        {/* Цветной баннер */}
        <div className="px-6 py-5" style={{ background: `linear-gradient(120deg, ${rc.bg} 0%, transparent 100%)`, borderBottom: `1px solid ${rc.border}` }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: rc.dot, boxShadow: `0 0 10px ${rc.dot}60` }} />
                <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: rc.text }}>
                  {rc.label} риск
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {result.contract_type}
              </h1>
              <p className="text-white/40 text-sm mt-1">
                {task.filename}
                {task.created_at && (
                  <> · {new Date(task.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {task.download_url && (
                <a
                  href={getDownloadUrl(taskId)}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0A0C14] hover:opacity-90 transition-opacity"
                  style={{ background: "#00E5CC" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  DOCX-отчёт
                </a>
              )}
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 border border-white/10 hover:border-white/20 hover:text-white transition-all"
              >
                Ещё один договор
              </Link>
            </div>
          </div>
        </div>

        {/* Резюме */}
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <p className="text-white/30 text-xs uppercase font-semibold tracking-widest mb-2">Резюме анализа</p>
          <p className="text-white/80 leading-relaxed">{result.summary}</p>
        </div>

        {/* Счётчики */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          {[
            { label: "Высокий риск", count: highCount, color: "#FF4D6D" },
            { label: "Средний риск", count: medCount, color: "#FF9F0A" },
            { label: "Низкий риск", count: lowCount, color: "#00E5CC" },
          ].map((item) => (
            <div key={item.label} className="px-6 py-4 text-center">
              <div className="text-3xl font-bold mb-0.5" style={{ color: item.color }}>{item.count}</div>
              <div className="text-white/35 text-xs">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Таблица рисков ────────────────────────────── */}
      <div className="rounded-2xl border p-6" style={CARD}>
        <h2 className="text-base font-semibold text-white mb-5">
          Выявленные риски{" "}
          <span className="ml-1.5 px-2 py-0.5 rounded-lg text-xs text-white/40" style={{ background: "rgba(255,255,255,0.06)" }}>
            {result.risks.length}
          </span>
        </h2>
        <RiskTable risks={result.risks} />
      </div>

      {/* ── Отсутствующие условия ─────────────────────── */}
      {result.missing_clauses.length > 0 && (
        <div className="rounded-2xl border p-6" style={CARD}>
          <h2 className="text-base font-semibold text-white mb-4">
            Отсутствующие условия{" "}
            <span className="ml-1.5 px-2 py-0.5 rounded-lg text-xs text-[#FF9F0A]" style={{ background: "rgba(255,159,10,0.1)" }}>
              {result.missing_clauses.length}
            </span>
          </h2>
          <div className="space-y-2">
            {result.missing_clauses.map((clause, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border" style={{ background: "rgba(255,159,10,0.05)", borderColor: "rgba(255,159,10,0.2)" }}>
                <span className="text-[#FF9F0A] flex-shrink-0 mt-0.5">⚠️</span>
                <p className="text-white/65 text-sm">{clause}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Вывод ─────────────────────────────────────── */}
      <div className="rounded-2xl border p-6" style={CARD}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-white/30 text-xs uppercase font-semibold tracking-widest mb-2">Вывод</p>
            <div className="flex items-center gap-3">
              <span className="text-white/65 text-sm">Необходима консультация юриста:</span>
              <span
                className="px-3 py-1 rounded-lg text-xs font-bold"
                style={
                  result.needs_lawyer
                    ? { background: "rgba(255,77,109,0.12)", color: "#FF4D6D", border: "1px solid rgba(255,77,109,0.25)" }
                    : { background: "rgba(0,229,204,0.08)", color: "#00E5CC", border: "1px solid rgba(0,229,204,0.2)" }
                }
              >
                {result.needs_lawyer ? "ДА" : "НЕТ"}
              </span>
            </div>
            <p className="text-white/20 text-xs mt-2">Подготовлено: LexAI.by · Результаты носят информационный характер</p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {task.download_url && (
              <a
                href={getDownloadUrl(taskId)}
                download
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0A0C14] hover:opacity-90 transition-opacity"
                style={{ background: "#00E5CC" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Скачать DOCX
              </a>
            )}
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white/65 border border-white/10 hover:border-white/20 hover:text-white transition-all"
            >
              Ещё один договор
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
