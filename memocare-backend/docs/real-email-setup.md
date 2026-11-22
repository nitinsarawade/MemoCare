# Setting up real email sending (SMTP)

The email code in MemoCare is already real (uses `nodemailer`) — it's
just not sending anything right now because your `.env` has no SMTP
server configured, so it silently skips sending and only logs a
debug line instead.

The easiest free option is a Gmail "App Password." Takes about 5
minutes.

## 1. Turn on 2-Step Verification on your Google account
Go to https://myaccount.google.com/security and enable **2-Step
Verification** if it isn't already on (required for App Passwords).

## 2. Create an App Password
1. Go to https://myaccount.google.com/apppasswords
2. Under "App name," type something like `MemoCare` and click **Create**
3. Google shows you a 16-character password (like `abcd efgh ijkl mnop`)
   — copy it. You won't be able to see it again after closing this screen.

## 3. Add these to your `.env` file
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youraddress@gmail.com
SMTP_PASS=abcdefghijklmnop
EMAIL_FROM=MemoCare <youraddress@gmail.com>
```
Use the 16-character App Password (no spaces) for `SMTP_PASS`, not
your normal Gmail password.

## 4. Restart the server
```powershell
npm run dev
```

## 5. Test it
Trigger any email-sending action — e.g. signing up a new account
(sends a verification email), or inviting a family member to a
patient. Check the inbox of the address you used in the request —
you should get a real email within seconds.

## Notes
- Gmail caps free sending at 500 emails/day — plenty for a demo or
  small real deployment.
- If you'd rather not use your personal Gmail, free tiers of
  SendGrid or Mailgun work the same way — just swap the `SMTP_HOST`/
  `SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` values for theirs.
