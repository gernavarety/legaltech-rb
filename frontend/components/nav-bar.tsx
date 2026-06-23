"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  free:  { label: "FREE",  className: "bg-slate-100 text-slate-600 border-slate-200" },
  solo:  { label: "SOLO",  className: "bg-blue-50 text-blue-700 border-blue-200" },
  firm:  { label: "FIRM",  className: "bg-violet-50 text-violet-700 border-violet-200" },
};

// Страницы где навбар не нужен (auth страницы имеют свой дизайн)
const HIDDEN_ON = ["/login", "/register", "/forgot-password"];

export default function NavBar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (HIDDEN_ON.includes(pathname)) return null;

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Лого */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">Lex</span>
          </div>
          <div>
            <span className="font-bold text-slate-900 text-lg">LexAI</span>
            <span className="text-blue-600 font-bold text-lg">.by</span>
          </div>
        </Link>

        {/* Правая часть */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <nav className="hidden md:flex items-center gap-1 text-sm">
                <NavLink href="/dashboard" current={pathname}>Кабинет</NavLink>
                <NavLink href="/generate" current={pathname}>Генератор</NavLink>
                <NavLink href="/history" current={pathname}>История</NavLink>
                <NavLink href="/pricing" current={pathname}>Тарифы</NavLink>
                <NavLink href="/settings" current={pathname}>Настройки</NavLink>
              </nav>

              {/* Кнопка загрузить договор */}
              <Link
                href="/"
                className="hidden md:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                + Проверить договор
              </Link>

              {/* Выход */}
              <button
                onClick={handleSignOut}
                className="text-sm text-slate-500 hover:text-slate-900 px-3 py-2 transition"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                href="/generate"
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2 transition"
              >
                Генератор
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2 transition"
              >
                Тарифы
              </Link>
              <Link
                href="/login"
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2 transition"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                Начать бесплатно
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: string;
  children: React.ReactNode;
}) {
  const active = current === href || current.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm transition ${
        active
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}
