import { redirect } from 'next/navigation'
import SettingsClient from '../../components/SettingsClient'
import { getSession } from '../../lib/auth'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <SettingsClient email={session.email} name={session.name} />
}
