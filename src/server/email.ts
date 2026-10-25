import 'server-only'
import { Resend } from 'resend'
import { serverEnv } from './env'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Branded, table-based HTML that renders well in Gmail/Outlook. */
export function emailLayout({ heading, intro, cta, footnote }: { heading: string; intro: string; cta?: { label: string; href: string }; footnote?: string }) {
  return `<!doctype html><html><body style="margin:0;background:#EEF2F9;font-family:'Plus Jakarta Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#334155">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F9;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:24px;border:1px solid #E6EAF2;overflow:hidden">
<tr><td style="height:6px;background:#2563EB"></td></tr>
<tr><td style="padding:32px 36px 8px"><table role="presentation"><tr>
<td style="width:30px;height:30px;border-radius:9px;background:#2563EB;color:#fff;font-weight:700;text-align:center;font-size:15px">M</td>
<td style="padding-left:10px;font-weight:700;font-size:18px;color:#0F172A">Mentora</td></tr></table></td></tr>
<tr><td style="padding:16px 36px 0"><h1 style="margin:0;font-weight:700;font-size:26px;line-height:1.2;color:#0F172A">${esc(heading)}</h1>
<p style="margin:14px 0 0;font-size:15px;line-height:1.6">${esc(intro)}</p></td></tr>
${cta ? `<tr><td style="padding:24px 36px 4px"><a href="${esc(cta.href)}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px">${esc(cta.label)}</a></td></tr>` : ''}
<tr><td style="padding:24px 36px 32px;font-size:12px;color:#55647A;line-height:1.6">${esc(footnote ?? 'You received this because you have a Mentora account. Manage email preferences in Account & preferences.')}</td></tr>
</table></td></tr></table></body></html>`
}

export function emailConfigured() {
  return !!serverEnv.resendKey
}

/** Send an email; returns false (never throws) when email is not configured or fails. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!serverEnv.resendKey) return false
  try {
    const resend = new Resend(serverEnv.resendKey)
    const { error } = await resend.emails.send({ from: serverEnv.emailFrom, to, subject, html })
    if (error) console.error('[mentora] email failed', error.name)
    return !error
  } catch (e) {
    console.error('[mentora] email exception', e instanceof Error ? e.message : e)
    return false
  }
}
