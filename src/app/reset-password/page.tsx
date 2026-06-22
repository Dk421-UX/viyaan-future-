import { redirect } from 'next/navigation'
import AuthShell from '../../components/AuthShell'
import { ResetPasswordForm } from '../../components/AuthForms'
import { getSession } from '../../lib/auth'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const session = await getSession()
  if (session) redirect('/dashboard')
  const params = await searchParams
  return <AuthShell eyebrow="Secure reset" title="Choose a new password." description="This will sign out any other sessions connected to your account."><ResetPasswordForm token={params?.token || ''} /></AuthShell>
}
