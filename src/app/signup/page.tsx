import { redirect } from 'next/navigation'
import AuthShell from '../../components/AuthShell'
import { SignupForm } from '../../components/AuthForms'
import { getSession } from '../../lib/auth'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')
  return <AuthShell eyebrow="Begin the timeline" title="Meet the person you become." description="Start with a private account. The first honest reflection does the rest."><SignupForm /></AuthShell>
}
