import { NextResponse } from 'next/server';
import { getBrivoToken, brivoApiHeaders, BRIVO_API_BASE } from '../../../lib/brivo';

export async function POST(req: Request) {
  try {
    const { pinCode } = await req.json();
    // Prefer a server-only var. NEXT_PUBLIC_* is exposed in the browser bundle,
    // so the PIN should be migrated to RESPONDER_PIN; the fallback keeps the
    // gate working until that rename happens in Vercel.
    const securePin = process.env.RESPONDER_PIN || process.env.NEXT_PUBLIC_RESPONDER_PIN;

    if (!securePin || pinCode !== securePin) {
      return NextResponse.json({ error: 'Invalid code.' }, { status: 401 });
    }

    // Authenticate to Brivo
    const auth = await getBrivoToken();
    if (!auth.ok) {
      console.error('Brivo unlock auth failed:', auth.step, auth.error, auth.detail);
      return NextResponse.json({ error: 'Lock system unavailable.', step: auth.step }, { status: auth.status });
    }

    const doorId = process.env.BRIVO_DOOR_ID;
    if (!doorId) {
      return NextResponse.json({ error: 'No door is configured (BRIVO_DOOR_ID).' }, { status: 500 });
    }

    const unlockResponse = await fetch(`${BRIVO_API_BASE}/v1/api/access-points/${doorId}/activate`, {
      method: 'POST',
      headers: {
        ...brivoApiHeaders(auth.token),
        'Content-Type': 'application/json',
      },
    });

    if (!unlockResponse.ok) {
      const detail = await unlockResponse.text();
      console.error('Brivo unlock rejected:', unlockResponse.status, detail);
      return NextResponse.json({ error: 'The door did not unlock. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Brivo unlock crash:', error);
    return NextResponse.json({ error: 'Lock system error.' }, { status: 500 });
  }
}
