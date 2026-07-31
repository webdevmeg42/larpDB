import type { Metadata } from 'next'
import Link from 'next/link'
import { privacyHtml } from './content'

export const metadata: Metadata = {
  title: 'Privacy Policy — PlotRunner',
}

export default function PrivacyPage() {
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
        <div dangerouslySetInnerHTML={{ __html: privacyHtml }} />
      </main>

      <footer className="border-t border-gray-200 mt-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex gap-6 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}
