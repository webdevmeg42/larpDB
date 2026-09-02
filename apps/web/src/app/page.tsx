import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { LandingPage } from './_components/LandingPage'

export default async function RootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (token) {
    redirect('/dashboard')
  }
  return <LandingPage />
}
