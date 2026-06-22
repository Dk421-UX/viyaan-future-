import bcrypt from 'bcrypt'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '../../../../lib/admin'
import { newSecureToken } from '../../../../lib/auth'
import { sendTemporaryPasswordEmail } from '../../../../lib/email'
import { prisma } from '../../../../lib/prisma'
import { sanitizeText } from '../../../../lib/server-guards'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const requestId = sanitizeText(body.requestId, 120)
  const action = sanitizeText(body.action, 40)
  if (!requestId) {
    return NextResponse.json({ success: false, error: 'Recovery request is required.' }, { status: 400 })
  }

  const request = await prisma.recoveryRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, email: true, name: true } } },
  })
  if (!request) {
    return NextResponse.json({ success: false, error: 'Recovery request not found.' }, { status: 404 })
  }

  if (action === 'approve') {
    await prisma.recoveryRequest.update({ where: { id: request.id }, data: { status: 'approved' } })
    return NextResponse.json({ success: true })
  }

  if (action === 'close') {
    await prisma.recoveryRequest.update({ where: { id: request.id }, data: { status: 'closed' } })
    return NextResponse.json({ success: true })
  }

  if (action === 'reset-and-send-temporary-password') {
    const user = request.user || await prisma.user.findUnique({
      where: { email: request.email },
      select: { id: true, email: true, name: true },
    })
    if (!user) {
      await prisma.recoveryRequest.update({ where: { id: request.id }, data: { status: 'no_account_found' } })
      return NextResponse.json({ success: false, error: 'No account exists for this request email.' }, { status: 404 })
    }

    const temporaryPassword = `Viyaan-${newSecureToken().slice(0, 18)}`
    const passwordHash = await bcrypt.hash(temporaryPassword, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.recoveryRequest.update({
        where: { id: request.id },
        data: { status: 'temporary_password_created', userId: user.id },
      }),
    ])
    try {
      await sendTemporaryPasswordEmail({ to: user.email, name: user.name, temporaryPassword })
      await prisma.recoveryRequest.update({
        where: { id: request.id },
        data: { status: 'temporary_password_sent' },
      })
      return NextResponse.json({ success: true, emailDelivered: true })
    } catch {
      return NextResponse.json({
        success: true,
        emailDelivered: false,
        temporaryPassword,
        message: 'Email delivery failed. Share this temporary password manually with the verified account owner.',
      })
    }
  }

  return NextResponse.json({ success: false, error: 'Unsupported recovery action.' }, { status: 400 })
}
