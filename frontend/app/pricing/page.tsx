"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getPlans, createCheckout, getSubscription, Plan, SubscriptionInfo } from "@/lib/api";

const CHECK = "✓";
const CROSS = "—";

const PLAN_HIGHLIGHTS: Record<string, { color: string; badge?: string }> = {
  free: { color: "border-slate-700" },
  solo: { color: "border-blue-500", badge: "Популярный" },
  firm: { color: "border-violet-500", badge: "Для юрфирм" },
};

const PLAN_BUTTON: Record<string, string> = {
  free: "bg-slate-700 hover:bg-slate-600",
  solo: "bg-blue-600 hover:bg-blue-500",
  firm: "bg-violet-600 hover:bg-violet-500",
};

const FEATURES = [
  { key: "checks_per_month", label: "Проверок в месяц" },
  { key: "max_file_mb", label: "Максимальный размер файла" },
  { key: "has_docx_download", label: "Скачивание DOCX-отчётов" },
  { key: "has_history", label: "История документов" },
  { key: "has_priority_queue", label: "Приоритетная обработка" },
  { key: "has_api_access", label: "API доступ" },
  { key: "max_team_members", label: "Командный доступ (участников)" },
];

function featureValue(plan: Plan, key: string): string {
  switch (key) {
    case "checks_per_month":
      return plan.checks_per_month === null ? "Безлимит" : `${plan.checks_per_month}`;
    case "max_file_mb":
      return `${plan.max_file_mb} МБ`;
    case "has_docx_download":
      return plan.has_docx_download ? CHECK : CROSS;
    case "has_history":
      return plan.has_history ? CHECK : CROSS;
    case "has_priority_queue":
      return plan.has_priority_queue ? CHECK : CROSS;
    case "has_api_access":
      return plan.has_api_access ? CHECK : CROSS;
    case "max_team_members":
      return plan.max_team_members === 1 ? CROSS : `до ${plan.max_team_members}`;
    default:
      return CROSS;
  }
}

export default function PricingPage() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { plans } = await getPlans();
      setPlans(plans);

      if (user) {
        const token = getAccessToken();
        try {
          const sub = await getSubscription(token);
          setSubscription(sub);
        } catch {}
      }
      setLoading(false);
    }
    load();
  }, [user, getAccessToken]);

  async function handleChoosePlan(planName: string) {
    if (planName === "free") return;

    if (!user) {
      router.push(`/register?redirect=/pricing`);
      return;
    }

    if (subscription?.plan_name === planName) return;

    setCheckoutLoading(planName);
    setError(null);

    try {
      const token = getAccessToken();
      const { payment_url } = await createCheckout(planName as "solo" | "firm", token);
      window.location.href = payment_url;
    } catch (e: any) {
      setError(e.message || "Ошибка при создании платежа");
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">Загрузка тарифов...</div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_name || "free";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 py-16 px-4">
      {/* Шапка */}
      <div className="max-w-5xl mx-auto text-center mb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-300 hover:text-white text-sm mb-8 transition">
          ← На главную
        </Link>
        <h1 className="text-4xl font-bold text-white mb-4">Тарифные планы</h1>
        <p className="text-blue-200 text-lg max-w-2xl mx-auto">
          Начните бесплатно. Перейдите на платный тариф когда понадобится больше.
        </p>
      </div>

      {/* Карточки тарифов */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {plans.map((plan) => {
          const highlight = PLAN_HIGHLIGHTS[plan.name] || { color: "border-slate-700" };
          const isCurrent = currentPlan === plan.name;
          const isLoading = checkoutLoading === plan.name;

          return (
            <div
              key={plan.id}
              className={`relative bg-white/5 backdrop-blur border-2 ${highlight.color} rounded-2xl p-6 flex flex-col`}
            >
              {highlight.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full text-white ${
                    plan.name === "solo" ? "bg-blue-600" : "bg-violet-600"
                  }`}>
                    {highlight.badge}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">{plan.display_name}</h2>
                <div className="mt-2">
                  {plan.price_usd === 0 ? (
                    <span className="text-3xl font-bold text-white">Бесплатно</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-white">${plan.price_usd}</span>
                      <span className="text-blue-300 ml-1">/месяц</span>
                    </>
                  )}
                </div>
              </div>

              {/* Ключевые характеристики */}
              <ul className="space-y-2 mb-6 flex-1">
                <li className="text-sm text-blue-100">
                  <span className="text-green-400 mr-2">✓</span>
                  {plan.checks_per_month === null
                    ? "Безлимитные проверки"
                    : `${plan.checks_per_month} проверок в месяц`}
                </li>
                <li className="text-sm text-blue-100">
                  <span className="text-green-400 mr-2">✓</span>
                  PDF{plan.name !== "free" ? " + DOCX" : ""} до {plan.max_file_mb} МБ
                </li>
                {plan.has_history && (
                  <li className="text-sm text-blue-100">
                    <span className="text-green-400 mr-2">✓</span>
                    История документов
                  </li>
                )}
                {plan.has_docx_download && (
                  <li className="text-sm text-blue-100">
                    <span className="text-green-400 mr-2">✓</span>
                    Скачивание DOCX-отчётов
                  </li>
                )}
                {plan.has_priority_queue && (
                  <li className="text-sm text-blue-100">
                    <span className="text-green-400 mr-2">✓</span>
                    Приоритетная обработка
                  </li>
                )}
                {plan.max_team_members > 1 && (
                  <li className="text-sm text-blue-100">
                    <span className="text-green-400 mr-2">✓</span>
                    Команда до {plan.max_team_members} юристов
                  </li>
                )}
                {plan.has_api_access && (
                  <li className="text-sm text-blue-100">
                    <span className="text-green-400 mr-2">✓</span>
                    API доступ для интеграций
                  </li>
                )}
              </ul>

              <button
                onClick={() => handleChoosePlan(plan.name)}
                disabled={isCurrent || plan.name === "free" || isLoading}
                className={`w-full py-3 rounded-xl font-semibold text-white transition ${
                  isCurrent
                    ? "bg-white/10 cursor-default text-white/50"
                    : plan.name === "free"
                    ? "bg-white/10 cursor-default"
                    : PLAN_BUTTON[plan.name]
                } disabled:opacity-60`}
              >
                {isCurrent
                  ? "Текущий тариф"
                  : isLoading
                  ? "Переходим к оплате..."
                  : plan.name === "free"
                  ? "Начать бесплатно"
                  : `Выбрать ${plan.display_name}`}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Таблица сравнения */}
      <div className="max-w-5xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Сравнение тарифов</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-blue-300 font-medium">Функция</th>
                {plans.map((p) => (
                  <th key={p.id} className="text-center py-3 px-4 text-white font-semibold">
                    {p.display_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature) => (
                <tr key={feature.key} className="border-b border-white/5 hover:bg-white/3">
                  <td className="py-3 px-4 text-blue-200">{feature.label}</td>
                  {plans.map((p) => {
                    const val = featureValue(p, feature.key);
                    const isCheck = val === CHECK;
                    const isCross = val === CROSS;
                    return (
                      <td key={p.id} className="text-center py-3 px-4">
                        <span className={
                          isCheck ? "text-green-400 font-bold" :
                          isCross ? "text-slate-600" :
                          "text-white"
                        }>
                          {val}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Частые вопросы</h2>
        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <details key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 group">
              <summary className="text-white font-medium cursor-pointer list-none flex justify-between items-center">
                {item.q}
                <span className="text-blue-400 ml-4">+</span>
              </summary>
              <p className="text-blue-200 text-sm mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Оплата в BYN */}
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-blue-300 text-sm">
          Оплата в белорусских рублях через{" "}
          <span className="text-white font-medium">Bepaid.by</span> —
          главный платёжный шлюз Беларуси.
          Visa, MasterCard, ERIP, карты белорусских банков.
        </p>
      </div>
    </div>
  );
}

const FAQ = [
  {
    q: "Можно ли отменить подписку в любой момент?",
    a: "Да. После отмены доступ к функциям сохраняется до конца оплаченного периода. Автоматического продления не будет.",
  },
  {
    q: "В какой валюте происходит оплата?",
    a: "Оплата происходит в белорусских рублях (BYN). Цены указаны в USD для удобства — сумма в BYN рассчитывается по официальному курсу Нацбанка РБ на день оплаты.",
  },
  {
    q: "Что такое «приоритетная обработка» в тарифе FIRM?",
    a: "Договоры клиентов FIRM попадают в отдельную очередь и обрабатываются первыми, без ожидания в общей очереди. Особенно важно при высокой нагрузке.",
  },
  {
    q: "Можно ли использовать LexAI.by через API?",
    a: "API доступ доступен на тарифе FIRM. Вы получите API ключ для интеграции в свои системы (CRM, DMS, корпоративный портал).",
  },
  {
    q: "Каковы гарантии конфиденциальности?",
    a: "Загруженные договоры не передаются третьим лицам. Данные хранятся на серверах в ЕС. AI-анализ выполняется через зашифрованные каналы.",
  },
];
