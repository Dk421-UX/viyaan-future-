import nodemailer from 'nodemailer'

type ResetEmail = {
  to: string
  name: string
  resetUrl: string
}

type MailContent = {
  subject: string
  text: string
  html: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function emailContent({ name, resetUrl }: ResetEmail) {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(resetUrl)
  const subject = 'Reset your Viyaan Future password'
  const text = `Hi ${name},\n\nUse this link to reset your Viyaan Future password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request it, you can safely ignore this email.`
  const html = `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;background:#f4f5f7;color:#191b20;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px 16px">
        <table role="presentation" style="width:100%;max-width:560px;margin:0 auto;border-collapse:collapse">
          <tr><td style="background:#ffffff;border:1px solid #e2e5e9;border-radius:18px;padding:40px">
            <div style="font-size:14px;font-weight:700;color:#09688c;letter-spacing:.08em;text-transform:uppercase">Viyaan Future</div>
            <h1 style="font-size:28px;line-height:1.2;margin:22px 0 12px">Reset your password</h1>
            <p style="font-size:16px;line-height:1.7;color:#515762;margin:0 0 22px">Hi ${safeName}, we received a request to reset the password for your private reflection timeline.</p>
            <a href="${safeUrl}" style="display:inline-block;background:#09688c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 20px;border-radius:10px">Reset Password</a>
            <p style="font-size:14px;line-height:1.7;color:#727985;margin:26px 0 0">This secure link expires in 1 hour and can only be used once.</p>
            <p style="font-size:14px;line-height:1.7;color:#727985;margin:10px 0 0">If you did not request this, no action is needed. Your password has not changed.</p>
          </td></tr>
        </table>
      </body>
    </html>`
  return { subject, text, html }
}

export async function sendPasswordResetEmail(input: ResetEmail) {
  const content = emailContent(input)
  await deliverEmail({ to: input.to, content })
}

export async function sendTemporaryPasswordEmail({
  to,
  name,
  temporaryPassword,
}: {
  to: string
  name: string
  temporaryPassword: string
}) {
  const safeName = escapeHtml(name)
  const safePassword = escapeHtml(temporaryPassword)
  await deliverEmail({
    to,
    content: {
      subject: 'Your Viyaan Future temporary password',
      text: `Hi ${name},\n\nYour temporary Viyaan Future password is:\n${temporaryPassword}\n\nSign in and change it immediately in Settings.`,
      html: `
        <!doctype html>
        <html lang="en">
          <body style="margin:0;background:#f4f5f7;color:#191b20;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px 16px">
            <table role="presentation" style="width:100%;max-width:560px;margin:0 auto;border-collapse:collapse">
              <tr><td style="background:#ffffff;border:1px solid #e2e5e9;border-radius:18px;padding:40px">
                <div style="font-size:14px;font-weight:700;color:#09688c;letter-spacing:.08em;text-transform:uppercase">Viyaan Future</div>
                <h1 style="font-size:28px;line-height:1.2;margin:22px 0 12px">Account recovery approved</h1>
                <p style="font-size:16px;line-height:1.7;color:#515762;margin:0 0 22px">Hi ${safeName}, your account recovery request was approved.</p>
                <p style="font-size:15px;line-height:1.7;color:#191b20;background:#f2f7fb;border:1px solid #dbeaf3;border-radius:12px;padding:14px 16px"><strong>Temporary password:</strong><br>${safePassword}</p>
                <p style="font-size:14px;line-height:1.7;color:#727985;margin:26px 0 0">Sign in and change this password immediately in Settings.</p>
              </td></tr>
            </table>
          </body>
        </html>`,
    },
  })
}

async function deliverEmail({ to, content }: { to: string; content: MailContent }) {
  const from = process.env.EMAIL_FROM || 'Viyaan Future <onboarding@resend.dev>'

  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) return
    const detail = await response.text()
    console.error('Resend delivery failed; trying SMTP fallback.', detail.slice(0, 300))
  }

  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    const port = Number(process.env.SMTP_PORT)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    })
    await transporter.sendMail({ from, to, ...content })
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[email:development] ${content.subject} for ${to}: ${content.text}`)
    return
  }

  throw new Error('No email delivery provider is configured')
}
