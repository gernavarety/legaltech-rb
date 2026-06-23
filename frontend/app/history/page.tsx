"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getHistory, deleteDocument, getDownloadUrl, HistoryDocument } from "@/lib/api";
import { getRiskBg, getRiskColor } from "@/lib/utils";

const RISK_FILTERS = [
  { value: "", label: "Все риски" },
  { value: "высокий", label: "Высокий" },
  { value: "средний", label: "Средний" },
  { value: "низкий", label: "Низкий" },
];

const RISK_ICONS: Record<string, string> = {
  высокий: "🔴",
  средний: "🟡",
  низкий: "🟢",
};

export default function HistoryPage() {
  const { getAccessToken } = useAuth();

  const [docs, setDocs] = useState<HistoryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, risk: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = getAccessToken();
        const res = await getHistory(token, p, risk || undefined);
        setDocs(res.documents);
        setTotal(res.total);
        setPages(res.pages);
      } catch (e: any) {
        if (e.code === "plan_required") {
          setError("История документов доступна на тарифах SOLO и FIRM.");
        } else {
          setError(e.message || "Ошибка загрузки истории");
        }
      }
      setLoading(false);
    },
    [getAccessToken]
  );

  useEffect(() => {
    load(page, riskFilter);
  }, [page, riskFilter, load]);

  async function handleDelete(docId: string) {
    if (!confirm("Удалить документ из истории?")) return;
    setDeletingId(docId);
    try {
      const token = getAccessToken();
      await deleteDocument(docId, token);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setTotal((prev) => prev - 1);
    } catch (e: any) {
      alert(e.message || "Ошибка удаления");
    }
    setDeletingId(null);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">История документов</h1>
          {!loading && !error && (
            <p className="text-sm text-slate-500 mt-1">Найдено: {total} документов</p>
          )}
        </div>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
        >
          + Проверить договор
        </Link>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 flex-wrap">
        {RISK_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setRiskFilter(f.value); setPage(1); }}
            className={`text-sm px-4 py-2 rounded-lg border transition ${
              riskFilter === f.value
                ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ошибка доступа */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium mb-3">{error}</p>
          <Link
            href="/pricing"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            Выбрать тариф SOLO
          </Link>
        </div>
      )}

      {/* Таблица */}
      {!error && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Загрузка...</div>
          ) : docs.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 mb-4">Документов не найдено</p>
              <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
                Загрузить первый договор
              </Link>
            </div>
          ) : (
            <>
              {/* Десктопная таблица */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-5 font-medium text-slate-500">Дата</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Файл</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Тип договора</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500">Риск</th>
                    <th className="text-right py-3 px-5 font-medium text-slate-500">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-900 font-medium truncate max-w-xs block">
                          {doc.filename}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {doc.contract_type || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {doc.overall_risk ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${getRiskBg(doc.overall_risk)} ${getRiskColor(doc.overall_risk)}`}>
                            {RISK_ICONS[doc.overall_risk]} {doc.overall_risk}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/result/${doc.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Открыть
                          </Link>
                          {doc.report_url && (
                            <a
                              href={getDownloadUrl(doc.id)}
                              download
                              className="text-slate-500 hover:text-slate-900"
                              title="Скачать DOCX"
                            >
                              ↓ DOCX
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="text-red-400 hover:text-red-600 transition disabled:opacity-50"
                            title="Удалить"
                          >
                            {deletingId === doc.id ? "..." : "✕"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Мобильные карточки */}
              <div className="md:hidden divide-y divide-slate-100">
                {docs.map((doc) => (
                  <div key={doc.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-sm font-medium text-slate-900 truncate flex-1">
                        {doc.filename}
                      </span>
                      {doc.overall_risk && (
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${getRiskBg(doc.overall_risk)} ${getRiskColor(doc.overall_risk)}`}>
                          {doc.overall_risk}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      {new Date(doc.created_at).toLocaleDateString("ru-RU")} ·{" "}
                      {doc.contract_type || "Тип не определён"}
                    </p>
                    <div className="flex gap-3">
                      <Link href={`/result/${doc.id}`} className="text-sm text-blue-600">
                        Открыть
                      </Link>
                      {doc.report_url && (
                        <a href={getDownloadUrl(doc.id)} download className="text-sm text-slate-500">
                          ↓ Скачать
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-sm text-red-400 ml-auto"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Пагинация */}
      {!error && pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
          >
            ← Назад
          </button>
          <span className="text-sm text-slate-500">
            Страница {page} из {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
