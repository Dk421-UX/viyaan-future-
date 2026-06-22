import { redirect } from 'next/navigation'
import AuthShell from '../../components/AuthShell'
import { ForgotPasswordForm } from '../../components/AuthForms'
import { getSession } from '../../lib/auth'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')
  return <AuthShell eyebrow="Account recovery" title="Find your way back." description="We’ll send a one-time link that expires in one hour."><ForgotPasswordForm /></AuthShell>
}
