// my-app/backend/src/controllers/spatial.js


import pool from '../config/db.js'; 

// Service Discovery: Find accessible places by category
export const getAccessibleServices = async (req, res) => {
    const { category, lat, lon } = req.query;
    try {
        const query = `
            SELECT id, name, category, wheelchair_accessible, avg_score,
                   ST_AsGeoJSON(geom)::json as location,
                   ST_Distance(geom, ST_SetSRID(ST_Point($1, $2), 4326)) as dist
            FROM places
            WHERE category = $3 
            AND (wheelchair_accessible = 'yes' OR has_ramp = true)
            ORDER BY avg_score DESC, dist ASC;
        `;
        const result = await pool.query(query, [lon, lat, category]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch services" });
    }
};

