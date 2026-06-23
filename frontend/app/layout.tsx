import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import NavBar from '@/components/nav-bar'

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
        <AuthProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
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
        </AuthProvider>
      </body>
    </html>
  )
}
