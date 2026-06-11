import { NextResponse } from 'next/server';
import { getBrivoToken, brivoApiHeaders, BRIVO_API_BASE } from '../../lib/brivo';

export const dynamic = 'force-dynamic';

export async function GET() {
  // STEP 1: authenticate
  const auth = await getBrivoToken();
  if (!auth.ok) {
    console.error('Brivo directory auth failed:', auth.step, auth.error, auth.detail);
    return NextResponse.json(
      { error: auth.error, step: auth.step },
      { status: auth.status }
    );
  }

  try {
    // STEP 2: fetch the resident list
    const residentsResponse = await fetch(`${BRIVO_API_BASE}/v1/api/users?pageSize=100`, {
      cache: 'no-store',
      headers: brivoApiHeaders(auth.token),
    });

    const text = await residentsResponse.text();
    if (!residentsResponse.ok) {
      console.error('Brivo users request rejected:', residentsResponse.status, text);
      return NextResponse.json(
        { error: 'Could not load the resident directory.', step: 'list-users' },
        { status: 502 }
      );
    }

    const data = JSON.parse(text);
    const rawList = data.data || data.users || data.results || [];

    // First initial + full last name, primary phone number.
    const residents = rawList
      .map((u: any) => ({
        id: u.id ?? '',
        firstName: u.firstName ? `${u.firstName.charAt(0)}.` : '',
        lastName: u.lastName || '',
        phoneNumber: u.phoneNumbers?.[0]?.number || '',
      }))
      // Drop blank/placeholder entries that have no name to display.
      .filter((r: any) => r.lastName || r.firstName);

    return NextResponse.json(residents);
  } catch (error: any) {
    console.error('Brivo directory crash:', error);
    return NextResponse.json({ error: 'Directory system error.', step: 'crash' }, { status: 500 });
  }
}
