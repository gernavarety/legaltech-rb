"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

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
    <header className="sticky top-0 z-50 bg-[#0A0C14]/90 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Лого */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#00E5CC]/10 border border-[#00E5CC]/30 rounded-lg flex items-center justify-center">
            <span className="text-[#00E5CC] font-bold text-xs">Lex</span>
          </div>
          <span className="font-semibold text-white text-[15px] tracking-tight">
            LexAI<span className="text-[#00E5CC]">.by</span>
          </span>
        </Link>

        {/* Навигация */}
        <div className="flex items-center gap-1">
          {user ? (
            <>
              <nav className="hidden md:flex items-center gap-0.5 text-sm mr-3">
                <NavLink href="/" current={pathname}>Анализ</NavLink>
                <NavLink href="/generate" current={pathname}>Генератор</NavLink>
                <NavLink href="/history" current={pathname}>История</NavLink>
                <NavLink href="/pricing" current={pathname}>Тарифы</NavLink>
                <NavLink href="/settings" current={pathname}>Настройки</NavLink>
              </nav>
              <Link
                href="/"
                className="hidden md:inline-flex items-center gap-1.5 bg-[#00E5CC] hover:bg-[#00CDB8] text-[#0A0C14] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                + Проверить договор
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-white/40 hover:text-white/70 px-3 py-2 transition-colors ml-1"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <nav className="hidden md:flex items-center gap-0.5 text-sm mr-2">
                <NavLink href="/generate" current={pathname}>Генератор</NavLink>
                <NavLink href="/pricing" current={pathname}>Тарифы</NavLink>
              </nav>
              <Link
                href="/login"
                className="text-sm text-white/60 hover:text-white px-3 py-2 transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="text-sm bg-[#00E5CC] hover:bg-[#00CDB8] text-[#0A0C14] font-semibold px-4 py-2 rounded-lg transition-colors"
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

function NavLink({ href, current, children }: { href: string; current: string; children: React.ReactNode }) {
  const active = current === href || (href !== "/" && current.startsWith(href + "/"));
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "text-[#00E5CC] bg-[#00E5CC]/10"
          : "text-white/60 hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </Link>
  );
}
