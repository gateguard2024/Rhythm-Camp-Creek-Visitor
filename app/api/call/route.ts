import { NextResponse } from 'next/server';

// Normalize any US phone input to E.164 (+1XXXXXXXXXX). Returns null if invalid.
function toE164(input?: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

export async function POST(request: Request) {
  try {
    const { visitorName, visitorPhone, residentPhone, residentName, reason } = await request.json();

    console.log("Call requested:", { visitorName, visitorPhone, residentPhone, residentName });

    // ==========================================
    // 1. VALIDATE INPUT
    // ==========================================
    const formattedVisitorPhone = toE164(visitorPhone);
    const formattedResidentPhone = toE164(residentPhone);

    if (!formattedVisitorPhone) {
      return NextResponse.json({ error: 'A valid visitor phone number is required.' }, { status: 400 });
    }
    if (!formattedResidentPhone) {
      return NextResponse.json({ error: 'No valid number is available for the person you are trying to reach.' }, { status: 400 });
    }

    // ==========================================
    // 2. TWILIO CONFIGURATION
    // ==========================================
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing Twilio environment variables in Vercel!", {
        hasSid: !!TWILIO_ACCOUNT_SID,
        hasToken: !!TWILIO_AUTH_TOKEN,
        hasNumber: !!TWILIO_PHONE_NUMBER,
      });
      return NextResponse.json({ error: 'Calling is not configured. Please contact the office.' }, { status: 500 });
    }

    const twilioAuthHeader = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    // ==========================================
    // 3. DELIVERY SMS INTERCEPT
    // ==========================================
    if (reason === "Package / Delivery Courier" || residentName === "Leasing Office (Delivery)") {
      try {
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuthHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedResidentPhone,
            From: TWILIO_PHONE_NUMBER,
            Body: `GATE ALERT: Delivery driver (${visitorName}) is requesting access at the gate. Connecting call now...`
          }).toString()
        });
      } catch (smsError) {
        console.error("Failed to send Delivery SMS:", smsError);
      }
    }

    // ==========================================
    // 4. TRIGGER THE ACTUAL PHONE CALL
    // ==========================================
    const twiml = `<Response><Say>Please wait while we connect your secure call.</Say><Dial callerId="${TWILIO_PHONE_NUMBER}">${formattedResidentPhone}</Dial></Response>`;

    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuthHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedVisitorPhone, // Twilio calls the visitor first, then bridges to the resident
        From: TWILIO_PHONE_NUMBER,
        Twiml: twiml
      }).toString()
    });

    if (!twilioResponse.ok) {
      const twilioErrorText = await twilioResponse.text();
      console.error("Twilio API rejected the call:", twilioResponse.status, twilioErrorText);
      return NextResponse.json({ error: 'Call failed to connect. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Call initiated.' });

  } catch (error: any) {
    console.error('Switchboard crash:', error);
    return NextResponse.json({ error: 'Critical system error.' }, { status: 500 });
  }
}
