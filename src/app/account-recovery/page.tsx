import { redirect } from 'next/navigation'
import AuthShell from '../../components/AuthShell'
import { AccountRecoveryForm } from '../../components/AuthForms'
import { getSession } from '../../lib/auth'

export const dynamic = 'force-dynamic'

export default async function AccountRecoveryPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')
  return (
    <AuthShell
      eyebrow="Account recovery backup"
      title="Request Account Recovery"
      description="If reset emails are not arriving, send a recovery request so you are not permanently locked out."
    >
      <AccountRecoveryForm />
    </AuthShell>
  )
}
