import { env } from '../config/env';
import { AppError } from '../utils/errors';

export async function sendSms(to: string, body: string) {
  if (env.isTest) return;
  if (!env.sms.accountSid || !env.sms.authToken || !env.sms.from) {
    throw AppError.serviceUnavailable('SMS delivery is not configured. Add Twilio credentials to the backend environment.');
  }
  const form = new URLSearchParams({ To: to, From: env.sms.from, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.sms.accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${env.sms.accountSid}:${env.sms.authToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!response.ok) throw AppError.serviceUnavailable('SMS provider rejected the message. Check the Twilio configuration.');
}
