// // my-app/backend/src/routes/route.js
// // src/routes/route.js

// import express from "express";
// import { places } from "../controllers/places.js";
// import { routes } from "../controllers/routes.js";
// import { report } from "../controllers/reports.js";
// import upload from "../middleware/upload.js";



// const router = express.Router();

// router.get("/place", places);
// router.post("/route", routes);
// router.post("/report", upload.single("photo"),report);

// export default router;
    

import express from 'express';
import upload from '../middleware/upload.js';

import { getPlaces } from '../controllers/places.js';
import { reverseGeocode} from '../controllers/places.js';
import { createReport } from '../controllers/reports.js';
import { findAccessiblePaths } from '../controllers/routes.js';

const router = express.Router();

// Places (services)
router.get('/places', getPlaces);

// Reports (alerts/obstacles)
router.post('/reports', upload.single('photo'), createReport);

// Routes
router.post('/routes', findAccessiblePaths);

router.get('/geocode/reverse', reverseGeocode);

export default router;