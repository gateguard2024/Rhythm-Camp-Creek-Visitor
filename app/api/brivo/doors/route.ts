import { NextResponse } from 'next/server';
import { getBrivoToken, brivoApiHeaders, BRIVO_API_BASE } from '../../../lib/brivo';

// =============================================================================
// TEMPORARY HELPER ROUTE — lists every Brivo door / access point with its ID.
// Open /api/brivo/doors in a browser, copy the "id" of the gate you want,
// set it as BRIVO_DOOR_ID, then delete this file.
// =============================================================================

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getBrivoToken();
  if (!auth.ok) {
    return NextResponse.json({ step: auth.step, error: auth.error, detail: auth.detail }, { status: auth.status });
  }

  try {
    const doorsResponse = await fetch(`${BRIVO_API_BASE}/v1/api/access-points?pageSize=100`, {
      cache: 'no-store',
      headers: brivoApiHeaders(auth.token),
    });

    const text = await doorsResponse.text();
    if (!doorsResponse.ok) {
      return NextResponse.json(
        { step: 'list-doors', status: doorsResponse.status, error: 'Brivo rejected access-points request', detail: text },
        { status: 502 }
      );
    }

    const data = JSON.parse(text);
    const rawList = data.data || data.results || [];
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
