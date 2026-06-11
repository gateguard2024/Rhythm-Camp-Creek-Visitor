import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { pinCode } = await req.json();
    const securePin = process.env.NEXT_PUBLIC_RESPONDER_PIN;

    // --- DEBUG LOGS: Check these in Vercel ---
    console.log("DEBUG: PIN Received from Keypad:", pinCode);
    console.log("DEBUG: PIN Found in Vercel Env:", securePin);
    console.log("DEBUG: Do they match?", pinCode === securePin);
    // -----------------------------------------

    if (!securePin || pinCode !== securePin) {
      return NextResponse.json({ error: "Invalid Code" }, { status: 401 });
    }

    // ... (rest of your Brivo unlock logic remains the same)
    const authResponse = await fetch('https://auth.brivo.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'api-key': process.env.BRIVO_API_KEY || '',
        'Authorization': `Basic ${process.env.BRIVO_AUTH_BASIC}`
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: process.env.BRIVO_USERNAME || '',
        password: process.env.BRIVO_PASSWORD || ''
      }).toString()
    });

    const authData = await authResponse.json();
    const doorId = process.env.BRIVO_DOOR_ID;
    
    const unlockResponse = await fetch(`https://api.brivo.com/v1/api/access-points/${doorId}/activate`, {
      method: 'POST',
      headers: {
        'api-key': process.env.BRIVO_API_KEY || '',
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!unlockResponse.ok) return NextResponse.json({ error: "Brivo Reject" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Crash" }, { status: 500 });
  }
}
