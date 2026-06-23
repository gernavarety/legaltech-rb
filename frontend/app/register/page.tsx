"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      setError(translateRegError(error));
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-white mb-3">Проверьте почту</h2>
          <p className="text-blue-200 mb-6">
            Мы отправили письмо на <span className="text-white font-medium">{email}</span>.
            Перейдите по ссылке в письме для подтверждения аккаунта.
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-8 py-3 transition"
          >
            Перейти ко входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">⚖️</span>
          <h1 className="text-2xl font-bold text-white mt-2">LexAI.by</h1>
          <p className="text-blue-300 text-sm mt-1">AI-анализ договоров по праву РБ</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-2">Создать аккаунт</h2>
          <p className="text-blue-300 text-sm mb-6">
            Бесплатно · 3 проверки в месяц
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

            <div>
              <label className="block text-sm text-blue-200 mb-1.5">Пароль</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/30 rounded-lg px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-blue-200 mb-1.5">Подтвердите пароль</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Повторите пароль"
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
              {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
            </button>
          </form>

          <p className="text-center text-xs text-blue-400 mt-4">
            Регистрируясь, вы соглашаетесь с условиями использования
          </p>

          <p className="text-center text-sm text-blue-300 mt-4">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-blue-400 hover:text-white font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function translateRegError(error: string): string {
  if (error.includes("already registered") || error.includes("already exists")) {
    return "Этот email уже зарегистрирован. Войдите или восстановите пароль.";
  }
  if (error.includes("Password should be at least")) {
    return "Пароль должен быть не менее 6 символов";
  }
  return error;
}
