"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Bepaid передаёт причину отказа в параметрах URL
const BEPAID_ERRORS: Record<string, string> = {
  "card_declined":          "Карта отклонена банком",
  "insufficient_funds":     "Недостаточно средств на карте",
  "expired_card":           "Карта просрочена",
  "incorrect_cvv":          "Неверный CVV-код",
  "do_not_honor":           "Операция отклонена банком",
  "transaction_not_allowed":"Транзакция запрещена",
  "lost_card":              "Карта утеряна или заблокирована",
  "processing_error":       "Ошибка процессинга. Попробуйте позже",
  "3ds_failed":             "Ошибка 3D-Secure подтверждения",
};

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const errorCode = searchParams.get("error") || "";
  const errorMessage = searchParams.get("message") || "";

  const displayError =
    BEPAID_ERRORS[errorCode] ||
    errorMessage ||
    "Платёж не прошёл. Попробуйте ещё раз или используйте другую карту.";

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10">
          {/* Иконка ошибки */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Оплата не прошла
          </h1>

          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-red-800 mb-1">Причина:</p>
            <p className="text-sm text-red-700">{displayError}</p>
          </div>

          {orderId && (
            <p className="text-xs text-slate-400 mb-6">
              Номер заказа: <code className="bg-slate-100 px-1 rounded">{orderId}</code>
            </p>
          )}

          <div className="text-sm text-slate-500 mb-8 space-y-1">
            <p>Что можно сделать:</p>
            <ul className="text-left list-disc pl-5 space-y-1 mt-2">
              <li>Проверьте данные карты и попробуйте снова</li>
              <li>Используйте другую карту</li>
              <li>Обратитесь в банк для разблокировки платежа</li>
              <li>Попробуйте позже, если ошибка на стороне банка</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
            >
              Попробовать снова
            </Link>
            <Link
              href="/dashboard"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition text-sm"
            >
              Вернуться в кабинет
            </Link>
          </div>

          <p className="text-xs text-slate-400 mt-6">
            Деньги не были списаны. Если возникли вопросы — напишите нам.
          </p>
        </div>
      </div>
    </div>
  );
}
