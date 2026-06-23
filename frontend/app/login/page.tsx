"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(translateAuthError(error));
      setLoading(false);
      return;
    }
    router.push(redirectTo);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Логотип */}
        <div className="text-center mb-8">
          <span className="text-4xl">⚖️</span>
          <h1 className="text-2xl font-bold text-white mt-2">LexAI.by</h1>
          <p className="text-blue-300 text-sm mt-1">AI-анализ договоров по праву РБ</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Войти в аккаунт</h2>

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

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm text-blue-200">Пароль</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Забыли пароль?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 transition"
            >
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>

          <p className="text-center text-sm text-blue-300 mt-6">
            Нет аккаунта?{" "}
            <Link href="/register" className="text-blue-400 hover:text-white font-medium">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function translateAuthError(error: string): string {
  if (error.includes("Invalid login credentials")) {
    return "Неверный email или пароль";
  }
  if (error.includes("Email not confirmed")) {
    return "Подтвердите email (проверьте почту)";
  }
  if (error.includes("Too many requests")) {
    return "Слишком много попыток. Попробуйте через несколько минут";
  }
  return error;
}
