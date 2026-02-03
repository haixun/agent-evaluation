import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sync - Agent Evaluation',
  description: 'Multi-agent conversation and evaluation platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen">
        {/* Header with gradient */}
        <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold text-white tracking-tight">Sync</span>
                  <span className="hidden sm:inline text-sm text-indigo-200 ml-2 font-medium">Agent Evaluation</span>
                </div>
              </Link>

              {/* Navigation */}
              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  New Run
                </Link>
                <Link
                  href="/history"
                  className="px-4 py-2 text-sm font-medium text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  History
                </Link>
                <Link
                  href="/settings"
                  className="px-4 py-2 text-sm font-medium text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Settings
                </Link>
              </div>
            </div>
          </nav>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>&copy; 2024 Sync. All rights reserved.</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                System Online
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
