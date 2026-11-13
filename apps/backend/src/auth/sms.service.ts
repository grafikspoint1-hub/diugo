import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class SmsService {
  async send(to: string, body: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER?.toLowerCase();
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_PHONE;
    if (provider !== 'twilio' || !sid || !token || !from) {
      throw new ServiceUnavailableException(process.env.NODE_ENV === 'production'
        ? 'SMS delivery is temporarily unavailable.'
        : 'SMS recovery is not configured. Set SMS_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE.');
    }

    const credentials = Buffer.from(`${sid}:${token}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }).catch(() => null);
    if (!response?.ok) throw new ServiceUnavailableException('SMS delivery is temporarily unavailable.');
  }
}
