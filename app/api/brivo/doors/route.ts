import { NextResponse } from 'next/server';

// =============================================================================
// TEMPORARY HELPER ROUTE — lists every Brivo door / access point with its ID.
// Open /api/brivo/doors in a browser, copy the "id" of the gate you want,
// set it as BRIVO_DOOR_ID, then delete this file.
// =============================================================================

export const dynamic = 'force-dynamic';

export async function GET() {
  const BRIVO_API_KEY = (process.env.BRIVO_API_KEY || '').trim();
  const BRIVO_USERNAME = process.env.BRIVO_USERNAME || '';
  const BRIVO_PASSWORD = process.env.BRIVO_PASSWORD || '';

  // Accept either a pre-encoded Basic header, or a raw client id + secret.
  const clientId = process.env.BRIVO_CLIENT_ID || '';
  const clientSecret = process.env.BRIVO_CLIENT_SECRET || '';
  const basic = process.env.BRIVO_AUTH_BASIC
    || (clientId && clientSecret
        ? Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        : '');

  // Report exactly which pieces are missing instead of failing silently.
  const missing: string[] = [];
  if (!basic) missing.push('BRIVO_AUTH_BASIC (or BRIVO_CLIENT_ID + BRIVO_CLIENT_SECRET)');
  if (!BRIVO_API_KEY) missing.push('BRIVO_API_KEY');
  if (!BRIVO_USERNAME) missing.push('BRIVO_USERNAME');
  if (!BRIVO_PASSWORD) missing.push('BRIVO_PASSWORD');
  if (missing.length) {
    return NextResponse.json({ step: 'config', error: 'Missing env vars', missing }, { status: 400 });
  }

  try {
    // STEP 1: get an access token (password grant)
    const tokenResponse = await fetch('https://auth.brivo.com/oauth/token', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'api-key': BRIVO_API_KEY,
        'Accept': '*/*',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: BRIVO_USERNAME,
        password: BRIVO_PASSWORD,
      }).toString(),
    });

    const tokenText = await tokenResponse.text();
    if (!tokenResponse.ok) {
      return NextResponse.json(
        { step: 'login', status: tokenResponse.status, error: 'Brivo rejected login', detail: tokenText },
        { status: 502 }
      );
    }
    const tokenData = JSON.parse(tokenText);
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json({ step: 'login', error: 'No access_token returned', detail: tokenData }, { status: 502 });
    }

    // STEP 2: list access points (doors)
    const doorsResponse = await fetch('https://api.brivo.com/v1/api/access-points?pageSize=100', {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'api-key': BRIVO_API_KEY,
      },
    });

    const doorsText = await doorsResponse.text();
    if (!doorsResponse.ok) {
      return NextResponse.json(
        { step: 'list-doors', status: doorsResponse.status, error: 'Brivo rejected access-points request', detail: doorsText },
        { status: 502 }
      );
    }

    const data = JSON.parse(doorsText);
    const rawList = data.data || data.users || data.results || [];

    const doors = rawList.map((d: any) => ({
      id: d.id,
      name: d.name || d.accessPointName || '(unnamed)',
      type: d.accessPointType || d.type || '',
    }));

    return NextResponse.json({
      step: 'done',
      count: doors.length,
      note: 'Copy the "id" of your gate into BRIVO_DOOR_ID, then delete app/api/brivo/doors/route.ts',
      doors,
    });
  } catch (error: any) {
    return NextResponse.json({ step: 'crash', error: error?.message || String(error) }, { status: 500 });
  }
}
