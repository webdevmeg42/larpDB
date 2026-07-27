import type { Metadata } from 'next'
import { Inter, IM_Fell_English } from 'next/font/google'
import './globals.css'
import { Providers } from '@/providers/Providers'

const inter = Inter({ subsets: ['latin'] })
const imFell = IM_Fell_English({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-heading',
})

export const metadata: Metadata = {
  title: 'PlotRunner',
  description: 'Adventure management platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${imFell.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
