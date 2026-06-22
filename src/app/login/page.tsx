import { redirect } from 'next/navigation'
import AuthShell from '../../components/AuthShell'
import { LoginForm } from '../../components/AuthForms'
import { getSession } from '../../lib/auth'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const session = await getSession()
  if (session) redirect('/dashboard')
  const params = await searchParams
  return <AuthShell eyebrow="Welcome back" title="Continue where you left off." description="Your timeline, letters, and remembered details are waiting."><LoginForm nextPath={params?.next} reset={params?.reset === '1'} /></AuthShell>
}
