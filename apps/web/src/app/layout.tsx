import type { Metadata } from 'next'
import { Inter, Cinzel_Decorative, Cinzel } from 'next/font/google'
import './globals.css'
import { Providers } from '@/providers/Providers'

const inter = Inter({ subsets: ['latin'] })

const cinzelDecorative = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-heading',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-label',
})

export const metadata: Metadata = {
  title: 'PlotRunner',
  description: 'Adventure management platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${cinzelDecorative.variable} ${cinzel.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
