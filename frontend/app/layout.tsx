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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0A0C14] text-white">
        <AuthProvider>
          <NavBar />
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
