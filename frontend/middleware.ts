/**
 * Next.js Middleware: защита роутов.
 *
 * Публичные страницы (не требуют авторизации):
 *   /  /login  /register  /forgot-password  /pricing  /payment/*
 *
 * Защищённые страницы (нужен valid Supabase JWT в cookie):
 *   /dashboard  /history  /settings  /result/*  и все остальные
 *
 * Supabase хранит токен в cookie: sb-{project-ref}-auth-token
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/pricing",
  "/payment",      // /payment/success, /payment/fail
  "/team/accept",  // принятие приглашения
  "/api/webhooks", // вебхуки Bepaid — без авторизации
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (pub) => pathname === pub || pathname.startsWith(pub + "/")
  );
}

function getSupabaseCookie(request: NextRequest): string | null {
  // Supabase хранит сессию в cookie: sb-<project-ref>-auth-token
  // Также возможен вариант с суффиксом .0, .1 для больших токенов
  for (const [name, value] of request.cookies) {
    if (name.startsWith("sb-") && name.includes("auth-token")) {
      return value;
    }
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Пропускаем статические файлы Next.js и API роуты бэкенда
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Публичные страницы — пропускаем без проверки
  if (isPublicPath(pathname)) {
    // Если авторизованный пользователь идёт на /login или /register — редиректим в /dashboard
    if (pathname === "/login" || pathname === "/register") {
      const token = getSupabaseCookie(request);
      if (token) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // Защищённые страницы: проверяем наличие cookie с токеном
  const token = getSupabaseCookie(request);
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Применяем middleware ко всем маршрутам кроме:
     * - _next/static (статика)
     * - _next/image (оптимизация изображений)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
