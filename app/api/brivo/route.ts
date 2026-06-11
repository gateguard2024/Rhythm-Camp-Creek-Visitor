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
    // STEP 2: fetch the FULL resident list, paging past Brivo's 100-per-page cap.
    const PAGE = 100;
    const MAX_PAGES = 50; // safety stop (5,000 residents)
    const rawList: any[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * PAGE;
      const res = await fetch(`${BRIVO_API_BASE}/v1/api/users?pageSize=${PAGE}&offset=${offset}`, {
        cache: 'no-store',
        headers: brivoApiHeaders(auth.token),
      });

      const text = await res.text();
      if (!res.ok) {
        console.error('Brivo users request rejected:', res.status, text);
        // If we already have some residents, return what we've got rather than failing.
        if (rawList.length) break;
        return NextResponse.json(
          { error: 'Could not load the resident directory.', step: 'list-users' },
          { status: 502 }
        );
      }

      const data = JSON.parse(text);
      const batch = data.data || data.users || data.results || [];
      rawList.push(...batch);

      const total = typeof data.count === 'number' ? data.count : undefined;
      if (batch.length < PAGE) break;                 // last page
      if (total !== undefined && rawList.length >= total) break;
    }

    const residents = rawList
      .map((u: any) => {
        const first = (u.firstName || '').trim();
        const last = (u.lastName || '').trim();
        return {
          id: u.id ?? '',
          // Display: first initial + full last name (caller-ID privacy).
          firstName: first ? `${first.charAt(0)}.` : '',
          lastName: last,
          phoneNumber: u.phoneNumbers?.[0]?.number || '',
          // Hidden field used only for searching by full first OR last name.
          search: `${first} ${last}`.toLowerCase().trim(),
        };
      })
      .filter((r: any) => r.search);

    return NextResponse.json(residents);
  } catch (error: any) {
    console.error('Brivo directory crash:', error);
    return NextResponse.json({ error: 'Directory system error.', step: 'crash' }, { status: 500 });
  }
}
