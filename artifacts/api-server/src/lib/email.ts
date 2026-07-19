/**
 * Email helper using Nodemailer.
 * Reads SMTP config from env vars. Throws at startup when vars are absent,
 * and throws on send failure so callers can surface errors to users.
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
import nodemailer from "nodemailer";

// ── Startup validation ────────────────────────────────────────────────────────

const SMTP_HOST = process.env["SMTP_HOST"];
const SMTP_PORT_RAW = process.env["SMTP_PORT"] ?? "587";
const SMTP_USER = process.env["SMTP_USER"];
const SMTP_PASS = process.env["SMTP_PASS"];
const SMTP_FROM =
  process.env["SMTP_FROM"] ?? process.env["SMTP_USER"] ?? "noreply@guidex.app";

const SMTP_PORT = parseInt(SMTP_PORT_RAW, 10);

const smtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

if (smtpConfigured) {
  console.info(
    `[email] SMTP configured — host=${SMTP_HOST} port=${SMTP_PORT} user=${SMTP_USER} from=${SMTP_FROM}`,
  );
} else {
  const missing = [
    !SMTP_HOST && "SMTP_HOST",
    !SMTP_USER && "SMTP_USER",
    !SMTP_PASS && "SMTP_PASS",
  ]
    .filter(Boolean)
    .join(", ");
  console.warn(
    `[email] SMTP NOT configured (missing: ${missing}) — email delivery will fail at runtime`,
  );
}

// ── Transport ─────────────────────────────────────────────────────────────────

function getTransport(): nodemailer.Transporter {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment secrets.",
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// ── Core send ─────────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  const transport = getTransport(); // throws if SMTP not configured
  try {
    await transport.sendMail({ from: SMTP_FROM, to, subject, html });
    console.info(`[email] Sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err);
    throw new Error(`Email delivery failed: ${(err as Error).message}`);
  }
}

// ── Public helpers ────────────────────────────────────────────────────────────

export async function sendVerificationCode(
  to: string,
  code: string,
): Promise<void> {
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
