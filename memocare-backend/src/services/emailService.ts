import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';

/**
 * SMTP transport.
 *
 * Brevo users: SMTP_HOST must be `smtp-relay.brevo.com`, SMTP_USER is your
 * Brevo account login email, SMTP_PASS is a Brevo **SMTP key** (generated in
 * Brevo → SMTP & API, starts with `xkeysib-`), and EMAIL_FROM must be an
 * address verified in Brevo (Senders & IP) — an unverified sender address is
 * by far the most common reason "the code is correct but no email arrives".
 * See docs/email-brevo-setup.md.
 */
const transporter = nodemailer.createTransport(
  env.smtp.url || {
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  }
);

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function describeSmtpError(err: any): string {
  const parts = [err?.message, err?.code, err?.command, err?.response]
    .filter(Boolean)
    .join(' | ');
  return parts || String(err);
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  if (!env.smtp.configured || env.isTest) {
    logger.debug({ to, subject }, 'Email suppressed (no SMTP host configured / test env)');
    return;
  }
  try {
    const info = await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
    logger.info({ to, subject, messageId: info?.messageId }, 'Email sent');
  } catch (err: any) {
    // Log the real SMTP failure so misconfiguration (wrong host, bad key,
    // unverified sender, rate limit) is visible in the server logs.
    logger.error(
      {
        err: describeSmtpError(err),
        host: env.smtp.url ? '(smtp url)' : env.smtp.host,
        port: env.smtp.port,
        from: env.smtp.from,
        to,
        subject,
      },
      'Failed to send email'
    );
    throw AppError.serviceUnavailable(
      `Email delivery failed (${describeSmtpError(err)}). Check the SMTP configuration and that the sender address is verified with your provider.`
    );
  }
}

/** Send a probe email to verify the SMTP setup end-to-end (used by `npm run email:test`). */
export async function sendTestEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'MemoCare SMTP test',
    html: '<p>This is a test message from the MemoCare backend. If you are reading this, your SMTP configuration works.</p>',
    text: 'This is a test message from the MemoCare backend. If you are reading this, your SMTP configuration works.',
  });
}

export const emailTemplates = {
  verifyEmail: (verifyUrl: string) => ({
    subject: 'Verify your MemoCare account',
    html: `<p>Welcome to MemoCare. Please verify your email by clicking the link below:</p>
           <p><a href="${verifyUrl}">${verifyUrl}</a></p>
           <p>This link expires in 24 hours.</p>`,
  }),
  passwordReset: (resetUrl: string) => ({
    subject: 'Reset your MemoCare password',
    html: `<p>We received a request to reset your password.</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>If you did not request this, you can safely ignore this email. This link expires in 1 hour.</p>`,
  }),
  patientLinkInvite: (inviterName: string, patientName: string, acceptUrl: string) => ({
    subject: `${inviterName} invited you to MemoCare`,
    html: `<p>${inviterName} has invited you to collaborate on care for ${patientName} on MemoCare.</p>
           <p><a href="${acceptUrl}">${acceptUrl}</a></p>`,
  }),
  riskAlert: (patientName: string, riskLevel: string) => ({
    subject: `Risk alert for ${patientName}`,
    html: `<p>A new speech analysis session for ${patientName} produced a <strong>${riskLevel}</strong> risk level. Please review the full report in MemoCare.</p>`,
  }),
  testReminder: (patientName: string) => ({
    subject: `Reminder: complete a speech check-in for ${patientName}`,
    html: `<p>It's time for ${patientName}'s next speech sample. Open MemoCare to record one.</p>`,
  }),
};
