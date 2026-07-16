/**
 * Email helper using Nodemailer.
 * Reads SMTP config from env vars. Gracefully skips sending when vars are absent.
 *
 * Required env vars (all optional — sending is a no-op when missing):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env["SMTP_HOST"];
  const port = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM = process.env["SMTP_FROM"] ?? process.env["SMTP_USER"] ?? "noreply@guidex.app";

async function send(to: string, subject: string, html: string): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.warn(`[email] SMTP not configured — skipping email to ${to}: ${subject}`);
    return;
  }
  try {
    await transport.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error(`[email] Failed to send email to ${to}:`, err);
  }
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  await send(
    to,
    "GuideX — Verify your email address",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#f1f5f9;border-radius:12px;">
      <h2 style="color:#3b82f6;margin-top:0;">GuideX Email Verification</h2>
      <p style="color:#94a3b8;">Enter the code below to verify your email address. It expires in <strong style="color:#f1f5f9;">15 minutes</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#f1f5f9;background:#1e293b;padding:16px 24px;border-radius:8px;border:1px solid #334155;">${code}</span>
      </div>
      <p style="color:#64748b;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
    </div>
    `,
  );
}

export async function sendAdminNewUserAlert(
  adminEmail: string,
  user: { name: string; email: string },
): Promise<void> {
  await send(
    adminEmail,
    `GuideX — New user request: ${user.name}`,
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#f1f5f9;border-radius:12px;">
      <h2 style="color:#3b82f6;margin-top:0;">New Account Request</h2>
      <p style="color:#94a3b8;"><strong style="color:#f1f5f9;">${user.name}</strong> (${user.email}) has verified their email and is awaiting your approval.</p>
      <p style="color:#94a3b8;">Log in to GuideX and navigate to <strong style="color:#f1f5f9;">User Requests</strong> to approve or decline.</p>
    </div>
    `,
  );
}

export async function sendApprovalResult(
  to: string,
  approved: boolean,
  role?: string,
): Promise<void> {
  if (approved) {
    await send(
      to,
      "GuideX — Your account has been approved",
      `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#f1f5f9;border-radius:12px;">
        <h2 style="color:#22c55e;margin-top:0;">Account Approved ✓</h2>
        <p style="color:#94a3b8;">Your GuideX account has been approved with the role <strong style="color:#f1f5f9;">${role ?? "engineer"}</strong>.</p>
        <p style="color:#94a3b8;">You can now <a href="https://guidex.app/login" style="color:#3b82f6;">sign in</a> to the platform.</p>
      </div>
      `,
    );
  } else {
    await send(
      to,
      "GuideX — Account request declined",
      `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#f1f5f9;border-radius:12px;">
        <h2 style="color:#ef4444;margin-top:0;">Account Request Declined</h2>
        <p style="color:#94a3b8;">Unfortunately, your GuideX account request has been declined. Please contact your administrator for more information.</p>
      </div>
      `,
    );
  }
}
