import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voice Agent - Interview Orchestration',
  description: '3-agent conversation and evaluation workflow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="/" className="text-xl font-semibold text-gray-800">
                Voice Agent
              </a>
              <div className="flex gap-6">
                <a href="/" className="text-gray-600 hover:text-gray-900">
                  New Run
                </a>
                <a href="/history" className="text-gray-600 hover:text-gray-900">
                  History
                </a>
                <a href="/prompts" className="text-gray-600 hover:text-gray-900">
                  Prompts
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
