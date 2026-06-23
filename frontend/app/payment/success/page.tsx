"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getSubscription, SubscriptionInfo } from "@/lib/api";

const PLAN_DISPLAY: Record<string, string> = {
  free: "FREE",
  solo: "SOLO",
  firm: "FIRM",
};

export default function PaymentSuccessPage() {
  const { getAccessToken } = useAuth();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const isStub = searchParams.get("stub") === "true";

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Даём вебхуку Bepaid 2 секунды на обработку перед тем как показать результат
    const timer = setTimeout(async () => {
      try {
        const token = getAccessToken();
        const data = await getSubscription(token);
        setSub(data);
      } catch {}
      setLoading(false);
    }, isStub ? 0 : 2000);

    return () => clearTimeout(timer);
  }, [getAccessToken, isStub]);

  const planName = sub?.plan_name || "solo";

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        {loading ? (
          <div className="space-y-4">
            <div className="text-5xl animate-bounce">⏳</div>
            <p className="text-slate-600">Подтверждаем оплату...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10">
            {/* Анимированная галочка */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Оплата прошла успешно!
            </h1>

            <p className="text-slate-500 mb-6">
              Тариф <strong className="text-slate-900">{PLAN_DISPLAY[planName]}</strong> активирован.
              {sub?.subscription?.current_period_end && (
                <>
                  {" "}Следующее списание:{" "}
                  <strong>
                    {new Date(sub.subscription.current_period_end).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </>
              )}
            </p>

            {orderId && (
              <p className="text-xs text-slate-400 mb-6">
                Номер заказа: <code className="bg-slate-100 px-1 rounded">{orderId}</code>
              </p>
            )}

            {/* Что активировано */}
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-left mb-6">
              <p className="text-sm font-semibold text-green-800 mb-2">Теперь вам доступно:</p>
              <ul className="space-y-1 text-sm text-green-700">
                {planName === "solo" && (
                  <>
                    <li>✓ 50 проверок договоров в месяц</li>
                    <li>✓ Скачивание DOCX-отчётов</li>
                    <li>✓ История всех документов</li>
                    <li>✓ Файлы до 10 МБ</li>
                  </>
                )}
                {planName === "firm" && (
                  <>
                    <li>✓ Безлимитные проверки</li>
                    <li>✓ Приоритетная обработка</li>
                    <li>✓ Команда до 5 юристов</li>
                    <li>✓ API доступ</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Проверить договор
              </Link>
              <Link
                href="/dashboard"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition text-sm"
              >
                Перейти в кабинет
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
