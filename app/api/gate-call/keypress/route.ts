import { getBrivoToken, brivoApiHeaders, BRIVO_API_BASE } from '../../../lib/brivo';

// Twilio posts here when the resident presses a key. Press 9 -> open the gate.
// Responds with TwiML (text/xml), not JSON.

function twiml(say: string): Response {
  const body = `<Response><Say voice="alice">${say}</Say><Hangup/></Response>`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/xml' } });
}

export async function POST(request: Request) {
  // Shared-secret guard so the open-gate webhook can't be triggered by randoms.
  const url = new URL(request.url);
  const expected = process.env.GATE_WEBHOOK_SECRET || '';
  if (expected && url.searchParams.get('k') !== expected) {
    console.warn('gate keypress: bad or missing secret token');
    return twiml('Not authorized. Goodbye.');
  }

  // Twilio sends the pressed digit as form-encoded "Digits".
  let digits = '';
  try {
    const form = await request.formData();
    digits = String(form.get('Digits') || '');
  } catch {
    // ignore; treated as no input
  }

  if (digits !== '9') {
    return twiml('No action taken. Goodbye.');
  }

  // Open the gate via Brivo (same activate call the keypad uses).
  const doorId = process.env.BRIVO_DOOR_ID;
  if (!doorId) {
    console.error('gate keypress: BRIVO_DOOR_ID not set');
    return twiml('The gate is not configured. Please contact the office.');
  }

  const auth = await getBrivoToken();
  if (!auth.ok) {
    console.error('gate keypress: Brivo auth failed:', auth.step, auth.error, auth.detail);
    return twiml('Unable to reach the gate system right now. Please try again.');
  }

  try {
    const res = await fetch(`${BRIVO_API_BASE}/v1/api/access-points/${doorId}/activate`, {
      method: 'POST',
      headers: { ...brivoApiHeaders(auth.token), 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('gate keypress: Brivo activate rejected:', res.status, detail);
      return twiml('The gate did not open. Please try again or contact the office.');
    }
    return twiml('Gate opening. Thank you.');
  } catch (e) {
    console.error('gate keypress crash:', e);
    return twiml('A system error occurred. Please contact the office.');
  }
}
