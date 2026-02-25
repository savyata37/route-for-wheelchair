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

// Routing: Find best path based on wheelchair constraints
exports.getAccessibleRoute = async (req, res) => {
    const { startLon, startLat, endLon, endLat } = req.body;
    try {
        // Query filters paths based on your DB columns: width_cm and incline_percent
        const query = `
            SELECT id, ST_AsGeoJSON(line_geom)::json as geometry, 
                   surface_type, incline_percent, width_cm, has_curb_cuts
            FROM paths
            WHERE width_cm >= 90 AND incline_percent <= 8
            ORDER BY ST_Distance(line_geom, ST_SetSRID(ST_Point($1, $2), 4326)) ASC
            LIMIT 10;
        `;
        const result = await pool.query(query, [startLon, startLat]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Routing calculation failed" });
    }
};