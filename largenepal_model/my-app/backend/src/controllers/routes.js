

import pool from '../config/db.js';

export const findAccessiblePaths = async (req, res) => {
  const { from, to } = req.body;

  if (!from?.lng || !from?.lat || !to?.lng || !to?.lat) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  try {
    const query = `
      SELECT 
        id,
        ST_AsGeoJSON(line_geom)::json AS geometry,
        surface_type, incline_percent, width_cm, has_curb_cuts, is_lit_at_night,
        CASE 
          WHEN width_cm >= 120 AND incline_percent <= 5 THEN 10
          WHEN width_cm >= 90 AND incline_percent <= 8 THEN 7
          ELSE 4
        END AS accessibility_score
      FROM paths
      WHERE ST_DWithin(line_geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 80)
         OR ST_DWithin(line_geom, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, 80)
      ORDER BY accessibility_score DESC, ST_Length(line_geom) ASC
      LIMIT 15
    `;

    const result = await pool.query(query, [from.lng, from.lat, to.lng, to.lat]);

    res.json(result.rows);
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Failed to find routes' });
  }
};