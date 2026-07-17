'use client'

import { AuthProvider } from './AuthProvider'
import { SiteConfigProvider } from './SiteConfigProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteConfigProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SiteConfigProvider>
  )
}
