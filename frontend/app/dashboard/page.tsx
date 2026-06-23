"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSubscription,
  getHistory,
  cancelSubscription,
  SubscriptionInfo,
  HistoryDocument,
} from "@/lib/api";
import { getRiskBg, getRiskColor } from "@/lib/utils";

const PLAN_COLORS: Record<string, string> = {
  free:  "from-slate-500 to-slate-700",
  solo:  "from-blue-500 to-blue-700",
  firm:  "from-violet-500 to-violet-700",
};

const PLAN_NAMES: Record<string, string> = {
  free: "FREE",
  solo: "SOLO",
  firm: "FIRM",
};

export default function DashboardPage() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [docs, setDocs] = useState<HistoryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const token = getAccessToken();
      const [subData, histData] = await Promise.all([
        getSubscription(token).catch(() => null),
        getHistory(token, 1).catch(() => ({ documents: [] })),
      ]);
      setSub(subData);
      setDocs(histData.documents.slice(0, 5));
      setLoading(false);
    }
    load();
  }, [user, getAccessToken]);

  async function handleCancel() {
    if (!cancelConfirm) {
      setCancelConfirm(true);
      return;
    }
    setCancelLoading(true);
    try {
      const res = await cancelSubscription(getAccessToken());
      setCancelMsg(res.message);
      setCancelConfirm(false);
      const token = getAccessToken();
      const updated = await getSubscription(token);
      setSub(updated);
    } catch (e: any) {
      setCancelMsg(e.message || "Ошибка отмены подписки");
    }
    setCancelLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400">Загружаем кабинет...</div>
      </div>
    );
  }

  const planName = sub?.plan_name || "free";
  const usage = sub?.usage;
  const subscription = sub?.subscription;
  const features = sub?.features;

  const checksUsed = usage?.checks_used ?? 0;
  const checksLimit = usage?.checks_limit;
  const isUnlimited = usage?.is_unlimited ?? false;
  const usagePercent = checksLimit ? Math.min((checksUsed / checksLimit) * 100, 100) : 0;

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const isCancelled = subscription?.cancel_at_period_end;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Личный кабинет</h1>

      {/* Блок тарифа */}
      <div className={`bg-gradient-to-br ${PLAN_COLORS[planName]} rounded-2xl p-6 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm mb-1">Текущий тариф</p>
            <h2 className="text-3xl font-bold">{PLAN_NAMES[planName]}</h2>
            {periodEnd && (
              <p className="text-white/70 text-sm mt-1">
                {isCancelled ? "Доступ до" : "Следующее списание:"}{" "}
                <span className="text-white font-medium">{periodEnd}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {planName !== "firm" && (
              <Link
                href="/pricing"
                className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Улучшить тариф
              </Link>
            )}
            {subscription && !isCancelled && (
              <button
                onClick={handleCancel}
                className="text-white/50 hover:text-white/80 text-xs transition"
              >
                {cancelConfirm ? "Подтвердить отмену?" : "Отменить подписку"}
              </button>
            )}
            {cancelConfirm && (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="bg-red-500/80 hover:bg-red-500 text-white text-xs px-3 py-1 rounded transition"
                >
                  {cancelLoading ? "..." : "Да, отменить"}
                </button>
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="bg-white/10 text-white text-xs px-3 py-1 rounded transition"
                >
                  Нет
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Прогресс-бар использования */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/80">Проверок использовано</span>
            <span className="text-white font-semibold">
              {isUnlimited ? `${checksUsed} / ∞` : `${checksUsed} / ${checksLimit}`}
            </span>
          </div>
          {!isUnlimited && checksLimit && (
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent >= 90 ? "bg-red-400" :
                  usagePercent >= 60 ? "bg-yellow-400" :
                  "bg-white"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
          {!isUnlimited && checksLimit && checksUsed >= checksLimit && (
            <p className="text-red-200 text-xs mt-2">
              Лимит исчерпан.{" "}
              <Link href="/pricing" className="underline">
                Перейдите на следующий тариф
              </Link>
            </p>
          )}
        </div>

        {cancelMsg && (
          <div className="mt-4 bg-white/10 rounded-lg p-3 text-sm text-white/90">
            {cancelMsg}
          </div>
        )}
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition group"
        >
          <span className="text-2xl">📄</span>
          <div>
            <p className="font-semibold text-slate-900 group-hover:text-blue-700">Проверить договор</p>
            <p className="text-xs text-slate-500">Загрузить PDF или DOCX</p>
          </div>
        </Link>

        {features?.has_history ? (
          <Link
            href="/history"
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition group"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-blue-700">История</p>
              <p className="text-xs text-slate-500">Все проверенные договоры</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-xl p-4 opacity-50">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-slate-900">История</p>
              <p className="text-xs text-slate-400">Доступно с тарифа SOLO</p>
            </div>
          </div>
        )}

        <Link
          href="/settings"
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition group"
        >
          <span className="text-2xl">⚙️</span>
          <div>
            <p className="font-semibold text-slate-900 group-hover:text-blue-700">Настройки</p>
            <p className="text-xs text-slate-500">Аккаунт и команда</p>
          </div>
        </Link>
      </div>

      {/* Последние документы */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Последние документы</h2>
          {features?.has_history && (
            <Link href="/history" className="text-sm text-blue-600 hover:text-blue-800">
              Все документы →
            </Link>
          )}
        </div>

        {docs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-400 text-sm">
              {features?.has_history
                ? "Вы ещё не проверяли договоры"
                : "История доступна начиная с тарифа SOLO"}
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition"
            >
              Проверить договор
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition">
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.filename}</p>
                  <p className="text-xs text-slate-400">
                    {doc.contract_type || "Тип не определён"} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                {doc.overall_risk && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRiskBg(doc.overall_risk)} ${getRiskColor(doc.overall_risk)}`}>
                    {doc.overall_risk}
                  </span>
                )}
                <Link
                  href={`/result/${doc.id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
                >
                  Открыть
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Баннер апгрейда для free */}
      {planName === "free" && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Перейдите на SOLO — $49/месяц</h3>
            <p className="text-sm text-slate-600 mt-1">
              50 проверок · История документов · Скачивание DOCX-отчётов · Email поддержка
            </p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition"
          >
            Выбрать тариф
          </Link>
        </div>
      )}
    </div>
  );
}
