// // my-app/frontend/app/api/search/route.ts
// import { NextResponse } from 'next/server';

// export const runtime = 'nodejs';

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const q = searchParams.get('q') || '';
    
//     if (!q) {
//       return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
//     }

//     console.log(`🔍 Searching for: "${q}"`);

//     // Call real Nominatim API from server (no CORS issues)
//     const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=en`;
    
//     const response = await fetch(url, {
//       headers: {
//         'User-Agent': 'NextJS-MapApp/1.0'
//       }
//     });

//     if (!response.ok) {
//       console.error('❌ Nominatim API error:', response.status);
//       return NextResponse.json({ error: 'Search failed' }, { status: 500 });
//     }

//     const data = await response.json();

//     if (!data || data.length === 0) {
//       console.warn(`⚠️ No results for: "${q}"`);
//       return NextResponse.json([], { status: 200 });
//     }

//     const result = data[0];
//     const formattedResult = {
//       lat: result.lat,
//       lon: result.lon,
//       display_name: result.display_name
//     };

//     console.log(`✅ Found: ${result.display_name}`);
    
//     return NextResponse.json([formattedResult], { status: 200 });
//   } catch (err) {
//     console.error('❌ Error:', err);
//     return NextResponse.json({ error: 'Search failed' }, { status: 500 });
//   }
// }


import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    console.log(`🔍 Searching for: "${q}"`);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=en`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WheelchairAccessApp/1.0 (contact@email.com)'
      }
    });

    if (!response.ok) {
      console.error('Nominatim error:', response.status);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const result = data[0];
    const formatted = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      display_name: result.display_name
    };

    return NextResponse.json([formatted]);
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}