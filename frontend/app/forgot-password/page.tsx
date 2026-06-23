"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">⚖️</span>
          <h1 className="text-2xl font-bold text-white mt-2">LexAI.by</h1>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-semibold text-white mb-3">Письмо отправлено</h2>
              <p className="text-blue-200 text-sm mb-6">
                Проверьте почту <span className="text-white">{email}</span> и перейдите
                по ссылке для сброса пароля.
              </p>
              <Link
                href="/login"
                className="inline-block text-blue-400 hover:text-white text-sm transition"
              >
                ← Вернуться ко входу
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Восстановление пароля</h2>
              <p className="text-blue-300 text-sm mb-6">
                Введите email — мы пришлём ссылку для сброса пароля.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-blue-200 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="юрист@example.by"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/30 rounded-lg px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition"
                >
                  {loading ? "Отправляем..." : "Отправить ссылку"}
                </button>
              </form>

              <p className="text-center text-sm text-blue-300 mt-6">
                <Link href="/login" className="text-blue-400 hover:text-white">
                  ← Вернуться ко входу
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
