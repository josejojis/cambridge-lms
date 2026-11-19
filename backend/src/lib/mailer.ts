import { env, isProd } from './env'

export interface Mail { to: string; subject: string; text: string; html?: string }

/** Pluggable email delivery. `log` (dev) prints a redacted preview and never sends. */
export async function sendMail(m: Mail) {
  if (m.to.endsWith('.invalid')) return { skipped: 'placeholder address' } // learner without email
  switch (env.MAIL_PROVIDER) {
    case 'log':
      if (isProd) throw new Error('MAIL_PROVIDER=log is not allowed in production')
      console.info(`[mail:log] to=${m.to.replace(/(^.).*(@.*$)/, '$1***$2')} subject="${m.subject}"\n${m.text}`)
      return { delivered: false }
    case 'resend': {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.MAIL_FROM, to: [m.to], subject: m.subject, text: m.text, html: m.html }),
      })
      if (!res.ok) throw new Error(`Resend responded ${res.status}`)
      return { delivered: true }
    }
    default:
      throw new Error(`Mail provider ${env.MAIL_PROVIDER} is not implemented yet`)
  }
}
