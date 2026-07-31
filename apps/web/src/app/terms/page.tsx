import type { Metadata } from 'next'
import Link from 'next/link'
import { tosHtml } from './content'

export const metadata: Metadata = {
  title: 'Terms of Service — PlotRunner',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-heading text-xl" style={{ color: '#c9a84c' }}>PlotRunner</span>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div dangerouslySetInnerHTML={{ __html: tosHtml }} />
      </main>

      <footer className="border-t border-gray-200 mt-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex gap-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  )
}
