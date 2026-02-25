

// In src/controllers/places.js

import pool from '../config/db.js';

export const getPlaces = async (req, res) => {
  const { category, wheelchair_accessible, lat, lng, radius = 5000 } = req.query;

  try {
    let query = `
      SELECT 
        id, name, category, 
        wheelchair_accessible, has_ramp, has_accessible_toilet,
        avg_score,
        ST_X(geom) AS lng, ST_Y(geom) AS lat
      FROM places
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    // New flexible accessibility filter
    if (wheelchair_accessible === 'true' || wheelchair_accessible === true) {
      // Show anything that is not clearly 'No'
      query += ` AND wheelchair_accessible IS NOT NULL 
                 AND LOWER(wheelchair_accessible) NOT IN ('no', 'false', '0')`;
    } else if (wheelchair_accessible === 'false' || wheelchair_accessible === false) {
      // Only strict 'No'
      query += ` AND LOWER(wheelchair_accessible) IN ('no', 'false', '0')`;
    }
    // If no filter sent → show everything (no condition added)

    // Optional distance filter
    if (lat && lng) {
      params.push(Number(lng), Number(lat), Number(radius));
      query += ` AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint($${params.length-2}, $${params.length-1}), 4326)::geography, $${params.length})`;
    }

    query += ` ORDER BY avg_score DESC NULLS LAST, name LIMIT 50`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Places error:', err);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
};

export const reverseGeocode = async (req, res) => {
  const { lat, lon, zoom = 16 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat/lon' });
  }


  
  // Prevent abuse from frontend spam (simple in-memory rate limit per IP)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const key = `geocode:${ip}`;
  // Example: simple check - in production use redis/memcache
  if (global.geocodeCache && global.geocodeCache[key] && Date.now() - global.geocodeCache[key] < 2000) {
    return res.status(429).json({ error: 'Rate limit exceeded - try again in a few seconds' });
  }
  global.geocodeCache = global.geocodeCache || {};
  global.geocodeCache[key] = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=${zoom}&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AccessMap-Nepal/1.0 (contact: prashamsha211@gmail.com)',  
        'Referer': 'https://localhost:3000',  
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Nominatim returned ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (!data || !data.display_name) {
      return res.json({ display_name: 'Unknown location', error: 'No address found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Reverse geocode failed:', err.message);
    res.status(503).json({ 
      error: 'Geocoding temporarily unavailable',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};