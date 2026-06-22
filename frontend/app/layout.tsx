import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LexAI.by — AI-анализ договоров по праву РБ',
  description: 'Автоматический анализ договоров на соответствие законодательству Республики Беларусь. Выявление рисков, ссылки на нормы ГК РБ, ТК РБ, ХПК РБ.',
  keywords: ['договор', 'юрист', 'Беларусь', 'анализ', 'ГК РБ', 'LegalTech'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Хедер */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">Lex</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 text-lg">LexAI</span>
                <span className="text-blue-600 font-bold text-lg">.by</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                Право РБ
              </span>
              <span className="text-slate-400">|</span>
              <span>Анализ договоров</span>
              <span>ГК РБ · ТК РБ · ХПК РБ</span>
            </nav>
          </div>
        </header>

        {/* Основной контент */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Футер */}
        <footer className="mt-16 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-500">
                © 2025 LexAI.by — AI-анализ договоров по законодательству РБ
              </div>
              <div className="text-xs text-slate-400 text-center md:text-right">
                Результаты носят информационный характер и не заменяют консультацию юриста.
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
