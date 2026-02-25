// // my-app/backend/app.js

// import express from "express";
// import helmet from "helmet";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import route from "./src/routes/route.js"; 

// // Create express app
// const app = express();

// // Middlewares
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(helmet());
// app.use(cors({
//   origin: "http://localhost:3000",
//   credentials: true
// }));

// // Routes
// app.use("/api", route);
// app.use("/", route);

// app.use("/uploads", express.static("uploads")); // Serve uploaded files

// // Basic test route
// app.get('/', (req, res) => {
//   res.json({ message: 'Backend API is running!' });
// });

// // Export default
// export default app;

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './src/routes/index.js';

const app = express();

// Security & parsing
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS - only allow your frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve uploaded photos
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;