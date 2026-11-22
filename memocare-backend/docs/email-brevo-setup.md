# Brevo (Sendinblue) SMTP setup for MemoCare

If you signed up for Brevo and emails are still not delivered, it is almost
always one of three things below. Follow this checklist exactly.

## 1. Put the right values in the backend `.env`

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your Brevo account login email, e.g. you@example.com>
SMTP_PASS=<your Brevo SMTP key — starts with xkeysib->
EMAIL_FROM="MemoCare <somebody@your-verified-sender-domain.com>"
```

Common mistakes:

- **Wrong host.** It is `smtp-relay.brevo.com` (not `smtp.brevo.com`, not `smtp.sendinblue.com`).
- **Wrong user.** `SMTP_USER` is your **Brevo login email** (or the SMTP login shown on the SMTP & API page), NOT the `xkeysib-` key. The key goes in `SMTP_PASS`.
- **Wrong password.** `SMTP_PASS` is the **SMTP key** generated in Brevo → *SMTP & API* → *SMTP key*. It starts with `xkeysib-`. It is not your Brevo account password and not an API v3 key (`xkeys-`).
- **Port confusion.** Use 587 (STARTTLS, `secure=false` for nodemailer) or 465 (implicit TLS). The backend picks TLS automatically from the port.
- Do **not** use `SMTP_URL` unless you build it correctly: `smtp://<login>:<xkeysib-key>@smtp-relay.brevo.com:587`. If `SMTP_URL` is set it overrides the individual fields.

## 2. Verify the sender address in Brevo (the #1 reason nothing arrives)

Brevo silently refuses (or spams-filters) mail from sender addresses you
have not verified:

1. Brevo dashboard → **Senders, Domains & Dedicated IPs** (Senders & IP).
2. **Add a sender** with an email address you own, verify it via the confirmation email.
3. Make sure `EMAIL_FROM` uses **exactly that address**. If you don't have a domain, use your personal email as the sender (e.g. `EMAIL_FROM="MemoCare <you@example.com>"`).
4. Optionally add **SPF/DKIM** records for your domain (Brevo shows the DNS entries to add) — otherwise Brevo may rewrite the sender and Gmail can reject the mail.

## 3. Test without touching the app

```bash
cd memocare-backend
npm run email:test -- <your.email@example.com>
```

- `✔ Email accepted by the SMTP server` → the setup works; check the inbox/spam.
- `✖ Email delivery failed …` → the error message printed will name the real
  SMTP problem (`535 Authentication failed`, `550 sender not verified`, etc.),
  and the server logs now contain the same detail for in-app emails.

## 4. Brevo-side checks if the server accepts but you still get nothing

- Brevo → **Transactional → Email** (or Logs) shows every message and its status. Look for `blocked` / `hard_bounced`.
- Free Brevo plans have a daily email quota; check **Plan & Usage**.
- Check the recipient's spam folder and add `no-reply@<your-sender>` to contacts while testing.

## 5. How the backend decides SMTP is "configured"

`SMTP_HOST` must be set and `SMTP_USER`/`SMTP_PASS` must not be the
placeholder `changeme` — otherwise emails are silently suppressed in
development (see `src/config/env.ts`). After editing `.env`, **restart the
backend** (`npm run dev`) — SMTP config is read at startup.
