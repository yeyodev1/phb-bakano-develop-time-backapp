import { CustomError } from "../errors/customError.error";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
}

function isEnabled() {
  return process.env.EMAIL_ENABLED !== "false" && !!process.env.RESEND_API_KEY;
}

export function layout(title: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const cta = ctaLabel
    ? `<a href="${ctaUrl || appUrl}" style="display:inline-block;background:#21bcfb;color:#0b1220;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px">${ctaLabel}</a>`
    : "";

  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#283645;font-family:Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#1e2260;border:1px solid rgba(33,188,251,.2);border-radius:16px;padding:24px">
      <p style="margin:0 0 4px;color:#21bcfb;font-size:12px;letter-spacing:1.5px;text-transform:uppercase">PHB · Develop Time</p>
      <h1 style="margin:0 0 16px;color:#ffffff;font-size:20px;line-height:1.3">${title}</h1>
      <div style="color:rgba(255,255,255,.78);font-size:14px;line-height:1.6">${bodyHtml}</div>
      <div style="margin-top:22px">${cta}</div>
    </div>
    <p style="margin:16px 0 0;text-align:center;color:rgba(255,255,255,.45);font-size:11px">
      PowerHouse Biotech × Bakano — Panel de solicitudes y horas de desarrollo
    </p>
  </div>
</body></html>`;
}

export async function sendMail({ to, subject, html }: SendMailInput) {
  if (!isEnabled()) {
    console.log(`[email] deshabilitado — se omite "${subject}"`);
    return { skipped: true };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "PHB Develop Time <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      console.error("[email] error Resend:", data);
      return { skipped: false, error: data };
    }

    return { skipped: false, data };
  } catch (error) {
    console.error("[email] fallo de red:", error);
    return { skipped: false, error };
  }
}

export async function sendMailOrThrow(input: SendMailInput) {
  const result = await sendMail(input);
  if (result.error) throw new CustomError("No se pudo enviar el correo", 502, result.error);
  return result;
}
