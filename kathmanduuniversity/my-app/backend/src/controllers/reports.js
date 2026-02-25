
import pool from '../config/db.js';
import { photoService } from '../services/photoService.js';

export const createReport = async (req, res) => {
  const { user_id, issue_type, description, lat, lng } = req.body;
  const photo = req.file;

  if (!issue_type || !description || !lat || !lng) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const photo_url = photo ? photoService.getUrl(photo.filename) : null;

    const result = await pool.query(
      `INSERT INTO reports (
        user_id, issue_type, description, photo_url, 
        location, is_active, created_at, expires_at
      ) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), true, NOW(), NOW() + INTERVAL '48 hours')
      RETURNING id, issue_type, description, photo_url, 
                ST_X(location) AS lng, ST_Y(location) AS lat, created_at`,
      [user_id || null, issue_type, description, photo_url, lng, lat]
    );

    res.status(201).json({ report: result.rows[0] });
  } catch (err) {
    console.error('Report creation error:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
};