"use client";

import Link from "next/link";
import { useState } from "react";

// ── цвета
const C = {
  teal: "#00E5CC",
  navy: "#0A0C14",
  card: "#0F1422",
  cardBorder: "rgba(255,255,255,0.07)",
  muted: "rgba(255,255,255,0.45)",
};

// ── иконки-SVG (inline для избежания linting ошибок с lucide)
function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ── Демо-карточки рисков
const DEMO_RISKS = [
  {
    level: "critical",
    color: "#FF4D6D",
    bg: "rgba(255,77,109,0.08)",
    border: "rgba(255,77,109,0.25)",
    label: "Критический",
    title: "Условие о форс-мажоре",
    desc: "Отсутствует перечень обстоятельств непреодолимой силы. Ст. 372 ГК РБ",
  },
  {
    level: "medium",
    color: "#FF9F0A",
    bg: "rgba(255,159,10,0.08)",
    border: "rgba(255,159,10,0.25)",
    label: "Средний",
    title: "Претензионный порядок",
    desc: "Срок ответа на претензию не указан. Ст. 10 ГК РБ требует досудебного урегулирования.",
  },
  {
    level: "info",
    color: "#00E5CC",
    bg: "rgba(0,229,204,0.06)",
    border: "rgba(0,229,204,0.2)",
    label: "Рекомендация",
    title: "Судебная юрисдикция",
    desc: "Рекомендуем уточнить территориальную подсудность — хозяйственный суд г. Минска.",
  },
];

// ── Шаблоны документов для секции генератора
const TEMPLATES = [
  { name: "Договор поставки", group: "Договоры", count: "10 шаблонов", slug: "supply_agreement" },
  { name: "Трудовой договор", group: "Трудовые документы", count: "4 шаблона", slug: "employment_contract" },
  { name: "Устав ООО", group: "Корпоративные", count: "3 шаблона", slug: "llc_charter" },
  { name: "Претензионное письмо", group: "Претензии", count: "2 шаблона", slug: "claim_letter" },
];

// ── Законодательная база
const LAW_CODES = [
  { code: "ГК РБ", label: "Гражданский кодекс", articles: "1100+ статей" },
  { code: "ТК РБ", label: "Трудовой кодекс", articles: "465 статей" },
  { code: "ХПК РБ", label: "Хозяйственный кодекс", articles: "280+ статей" },
  { code: "КоАП", label: "Кодекс об адм. правонарушениях", articles: "370+ статей" },
];

// ── Тарифы
const PLANS = [
  {
    badge: "FREE",
    name: "Базовый",
    price: "Бесплатно",
    period: "",
    features: ["3 анализа в месяц", "PDF-отчёт", "3 генерации документов"],
    cta: "Начать бесплатно",
    href: "/register",
    highlight: false,
  },
  {
    badge: "SOLO",
    name: "Соло",
    price: "99 BYN",
    period: "/мес",
    features: [
      "30 анализов в месяц",
      "30 генераций документов",
      "Скачивание DOCX и PDF",
      "История документов",
    ],
    cta: "Купить сейчас",
    href: "/register?plan=solo",
    highlight: true,
  },
  {
    badge: "FIRM",
    name: "Для юр. фирм",
    price: "Индивидуально",
    period: "",
    features: [
      "Безлимитные анализы",
      "Безлимитные генерации",
      "Приоритетная поддержка",
    ],
    cta: "Связаться",
    href: "/register?plan=firm",
    highlight: false,
  },
];

export default function HomePage() {
  const [activeRisk, setActiveRisk] = useState(1);

  return (
    <div className="min-h-screen bg-[#0A0C14] text-white overflow-hidden">

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative pt-24 pb-32 px-4">
        {/* фоновые блюры */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#00E5CC]/[0.04] rounded-full blur-[120px]" />
          <div className="absolute top-48 right-0 w-[400px] h-[400px] bg-blue-700/[0.05] rounded-full blur-[100px]" />
          {/* сетка */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00E5CC]/20 bg-[#00E5CC]/[0.06] mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E5CC] animate-pulse" />
            <span className="text-[#00E5CC] text-xs font-medium tracking-widest uppercase">
              Юридический интеллект · Право РБ
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold leading-[1.08] mb-6 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Юридический интеллект
            <br />
            <span style={{ color: C.teal }}>нового поколения</span>
          </h1>

          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            AI анализирует договоры по нормам ГК&nbsp;РБ, ТК&nbsp;РБ, ХПК&nbsp;РБ за&nbsp;60 секунд
            и генерирует юридически грамотные документы.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/analyze"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[#0A0C14] transition-all"
              style={{ background: C.teal }}
            >
              Проверить договор
              <IconArrow />
            </Link>
            <Link
              href="/generate"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-medium text-white/80 border border-white/[0.12] hover:border-white/25 hover:text-white transition-all"
            >
              Генератор документов
            </Link>
          </div>

          {/* badges */}
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            {[
              { icon: "⚡", text: "Ответ за 60 сек" },
              { icon: "📋", text: "ГК · ТК · ХПК РБ" },
              { icon: "🔒", text: "Данные защищены" },
              { icon: "🤖", text: "Claude AI" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-2 text-sm text-white/40">
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ РИСКИ ══════════════ */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <span className="text-[#00E5CC] text-xs font-semibold tracking-widest uppercase">
              Анализ рисков
            </span>
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Сканирование рисков в реальном времени
          </h2>
          <p className="text-white/45 mb-12 max-w-lg">
            AI выявляет критические нарушения, средние риски и рекомендации — с&nbsp;точными
            ссылками на статьи законодательства РБ.
          </p>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* карточки рисков */}
            <div className="space-y-3">
              {DEMO_RISKS.map((risk, i) => (
                <button
                  key={risk.level}
                  onClick={() => setActiveRisk(i)}
                  className="w-full text-left p-4 rounded-xl border transition-all duration-200"
                  style={{
                    background: activeRisk === i ? risk.bg : "rgba(255,255,255,0.02)",
                    borderColor: activeRisk === i ? risk.border : "rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: risk.color, boxShadow: `0 0 8px ${risk.color}60` }}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: risk.color }}>
                          {risk.label}
                        </span>
                        <span className="text-white/80 text-sm font-medium">{risk.title}</span>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed">{risk.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* документ-превью */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: C.card, borderColor: C.cardBorder }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-[#FF4D6D]" />
                <div className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
                <div className="w-2 h-2 rounded-full bg-[#00E5CC]" />
                <span className="ml-2 text-white/30 text-xs">Договор поставки №47/2025</span>
              </div>
              {/* имитация текста документа */}
              <div className="space-y-2.5 mb-6">
                {[100, 85, 92, 70, 88, 75, 60].map((w, i) => (
                  <div
                    key={i}
                    className="h-2 rounded-full"
                    style={{
                      width: `${w}%`,
                      background:
                        i === 2 ? "rgba(255,77,109,0.35)" :
                        i === 4 ? "rgba(255,159,10,0.3)" :
                        "rgba(255,255,255,0.07)",
                    }}
                  />
                ))}
              </div>
              {/* активный риск */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  background: DEMO_RISKS[activeRisk].bg,
                  borderColor: DEMO_RISKS[activeRisk].border,
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: DEMO_RISKS[activeRisk].color }}
                  />
                  <span className="text-xs font-semibold" style={{ color: DEMO_RISKS[activeRisk].color }}>
                    {DEMO_RISKS[activeRisk].label}
                  </span>
                </div>
                <p className="text-sm text-white/75">{DEMO_RISKS[activeRisk].title}</p>
                <p className="text-xs text-white/40 mt-1">{DEMO_RISKS[activeRisk].desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ БАЗА ЗАКОНОВ ══════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#00E5CC] text-xs font-semibold tracking-widest uppercase block mb-3">
              Правовая база
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Интеграция с правовой базой РБ
            </h2>
            <p className="text-white/45 max-w-md mx-auto">
              Актуальная база нормативных актов Республики Беларусь с семантическим поиском по тексту.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {LAW_CODES.map((lc) => (
              <div
                key={lc.code}
                className="rounded-2xl p-5 border text-center group hover:border-[#00E5CC]/30 transition-colors"
                style={{ background: C.card, borderColor: C.cardBorder }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-[#00E5CC] group-hover:bg-[#00E5CC]/10 transition-colors"
                  style={{ background: "rgba(0,229,204,0.07)" }}
                >
                  <IconBook />
                </div>
                <div className="font-bold text-white text-base mb-1">{lc.code}</div>
                <div className="text-white/40 text-xs mb-1">{lc.label}</div>
                <div className="text-[#00E5CC]/60 text-xs">{lc.articles}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ ГЕНЕРАТОР ══════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-[#00E5CC] text-xs font-semibold tracking-widest uppercase block mb-3">
                Документы
              </span>
              <h2
                className="text-3xl md:text-4xl font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Генератор документов
              </h2>
              <p className="text-white/45 mt-2 max-w-sm">
                20 шаблонов юридических документов по праву РБ. AI составит за 30–60 сек.
              </p>
            </div>
            <Link
              href="/generate"
              className="hidden md:inline-flex items-center gap-2 text-sm text-[#00E5CC] hover:text-white transition-colors"
            >
              Открыть каталог <IconArrow />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEMPLATES.map((t) => (
              <Link
                key={t.slug}
                href={`/generate/${t.slug}`}
                className="rounded-2xl p-5 border hover:border-[#00E5CC]/25 group transition-all"
                style={{ background: C.card, borderColor: C.cardBorder }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-[#00E5CC] group-hover:bg-[#00E5CC]/10 transition-colors"
                  style={{ background: "rgba(0,229,204,0.07)" }}
                >
                  <IconDoc />
                </div>
                <div className="text-sm font-semibold text-white mb-1">{t.name}</div>
                <div className="text-xs text-white/35">{t.group}</div>
                <div
                  className="mt-4 inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{ background: "rgba(0,229,204,0.08)", color: "#00E5CC" }}
                >
                  {t.count}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center md:hidden">
            <Link href="/generate" className="text-sm text-[#00E5CC]">
              Открыть каталог →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════ ТАРИФЫ ══════════════ */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#00E5CC] text-xs font-semibold tracking-widest uppercase block mb-3">
              Тарифы
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Тарифные планы
            </h2>
            <p className="text-white/45">
              Выберите тариф и получите доступ ко всем функциям платформы.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.badge}
                className="rounded-2xl p-6 border relative flex flex-col"
                style={{
                  background: plan.highlight ? "linear-gradient(135deg,#0F1D2E,#0A1A24)" : C.card,
                  borderColor: plan.highlight ? "#00E5CC" : C.cardBorder,
                  boxShadow: plan.highlight ? "0 0 40px rgba(0,229,204,0.08)" : undefined,
                }}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "#00E5CC", color: "#0A0C14" }}
                  >
                    Рекомендуем
                  </div>
                )}

                <div
                  className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider mb-4 w-fit"
                  style={{
                    background: plan.highlight ? "rgba(0,229,204,0.15)" : "rgba(255,255,255,0.06)",
                    color: plan.highlight ? "#00E5CC" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {plan.badge}
                </div>

                <div className="mb-1">
                  <span
                    className="text-3xl font-bold"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-white/40 text-sm ml-1">{plan.period}</span>
                  )}
                </div>
                <div className="text-white/50 text-sm mb-6">{plan.name}</div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/65">
                      <span
                        className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: plan.highlight ? "rgba(0,229,204,0.15)" : "rgba(255,255,255,0.07)",
                          color: plan.highlight ? "#00E5CC" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        <IconCheck />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className="w-full text-center py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: plan.highlight ? "#00E5CC" : "rgba(255,255,255,0.07)",
                    color: plan.highlight ? "#0A0C14" : "rgba(255,255,255,0.75)",
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-white/25 text-xs mt-8">
            Все тарифы включают безопасное хранение данных и соответствие законодательству РБ.
          </p>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="rounded-3xl p-10 md:p-14 border relative overflow-hidden"
            style={{ background: C.card, borderColor: C.cardBorder }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#00E5CC]/[0.04] rounded-full blur-[60px]" />
            </div>
            <div className="relative">
              <h2
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Проверьте договор прямо сейчас
              </h2>
              <p className="text-white/45 mb-8">
                Загрузите PDF или DOCX — AI выявит риски за 60 секунд. Первые 3 анализа бесплатно.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/analyze"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-[#0A0C14] transition-all"
                  style={{ background: C.teal }}
                >
                  Анализировать договор
                  <IconArrow />
                </Link>
                <Link
                  href="/generate"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-medium text-white/70 border border-white/[0.10] hover:border-white/20 transition-all"
                >
                  Генератор документов
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="border-t border-white/[0.06] py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#00E5CC]/10 border border-[#00E5CC]/20 rounded-lg flex items-center justify-center">
              <span className="text-[#00E5CC] font-bold text-[10px]">Lex</span>
            </div>
            <span className="text-sm text-white/40">
              © 2025 LexAI.by — AI-анализ договоров по праву РБ
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/pricing" className="hover:text-white/60 transition-colors">Тарифы</Link>
            <Link href="/generate" className="hover:text-white/60 transition-colors">Генератор</Link>
            <Link href="/login" className="hover:text-white/60 transition-colors">Войти</Link>
            <span>Результаты носят информационный характер.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
