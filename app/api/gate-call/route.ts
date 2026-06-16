import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '../../config';

// Normalize a US phone number to E.164 (+1XXXXXXXXXX). Returns null if invalid.
function toE164(input?: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+1${digits}` : null;
}

// Escape text destined for inline TwiML/XML.
function xml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(request: Request) {
  try {
    const { residentPhone, residentName, visitorName, reason } = await request.json();

    const to = toE164(residentPhone);
    if (!to) {
      return NextResponse.json({ error: 'No valid number is available for that resident.' }, { status: 400 });
    }
    if (!visitorName || !visitorName.trim()) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }

    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio env vars for gate-call');
      return NextResponse.json({ error: 'Calling is not configured. Please contact the office.' }, { status: 500 });
    }
    const from = TWILIO_PHONE_NUMBER.startsWith('+') ? TWILIO_PHONE_NUMBER : (toE164(TWILIO_PHONE_NUMBER) || TWILIO_PHONE_NUMBER);

    // Absolute URL Twilio will POST the keypress to (must be reachable publicly).
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const secret = process.env.GATE_WEBHOOK_SECRET || '';
    const actionUrl = `${proto}://${host}/api/gate-call/keypress${secret ? `?k=${encodeURIComponent(secret)}` : ''}`;

    const property = SITE_CONFIG.propertyName || 'the';
    const announce =
      `You have a visitor at the ${property} gate. ` +
      `${visitorName}${reason ? `, here for ${reason}` : ''}.`;

    // Single outbound leg: announce, then gather one digit. Press 9 -> open gate.
    const twiml =
      `<Response>` +
        `<Gather numDigits="1" timeout="20" action="${xml(actionUrl)}" method="POST">` +
          `<Say voice="alice">${xml(announce)} Press 9 to open the gate. Press any other key, or hang up, to decline.</Say>` +
          `<Pause length="2"/>` +
          `<Say voice="alice">Press 9 to open the gate.</Say>` +
        `</Gather>` +
        `<Say voice="alice">No response received. Goodbye.</Say>` +
        `<Hangup/>` +
      `</Response>`;

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Twiml: twiml }).toString(),
    });

    if (!twilioRes.ok) {
      const detailText = await twilioRes.text();
      console.error('Twilio rejected gate-call:', twilioRes.status, detailText);
      let detail = '';
      try {
        const tw = JSON.parse(detailText);
        if (tw?.code || tw?.message) detail = ` (Twilio ${tw.code || ''}: ${tw.message || ''})`;
      } catch {}
      return NextResponse.json({ error: `Could not reach the resident.${detail}`.trim() }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Calling resident.' });
  } catch (error: any) {
    console.error('gate-call crash:', error);
    return NextResponse.json({ error: 'Gate call system error.' }, { status: 500 });
  }
}
