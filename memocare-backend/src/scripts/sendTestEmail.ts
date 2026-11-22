/**
 * Sends a test email through the configured SMTP transport so you can verify
 * your provider setup (e.g. Brevo) without exercising the whole app.
 *
 * Usage:  npm run email:test -- someone@example.com
 */
import { env } from '../config/env';
import { sendTestEmail } from '../services/emailService';

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npm run email:test -- <recipient email>');
    process.exit(1);
  }
  if (!env.smtp.configured) {
    console.error('SMTP is not configured. Fill SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM (or SMTP_URL) in your .env first.');
    console.error('For Brevo: host smtp-relay.brevo.com, user = Brevo login email, pass = SMTP key (xkeysib-…), sender must be verified in Brevo.');
    process.exit(1);
  }
  console.log(`Sending test email via ${env.smtp.host || 'SMTP_URL'}:${env.smtp.port} from "${env.smtp.from}" to ${to} …`);
  try {
    await sendTestEmail(to);
    console.log('✔ Email accepted by the SMTP server. Check the inbox (and spam folder).');
    process.exit(0);
  } catch (err: any) {
    console.error('✖ Email delivery failed:', err?.message ?? err);
    console.error('Brevo checklist: 1) SMTP key from Brevo → SMTP & API (xkeysib-…), 2) SMTP_HOST=smtp-relay.brevo.com port 587, 3) EMAIL_FROM must exactly match a sender verified in Brevo → Senders & IP.');
    process.exit(1);
  }
}

main();
