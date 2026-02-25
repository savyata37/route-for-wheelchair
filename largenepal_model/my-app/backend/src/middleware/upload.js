


// Import required modules
import multer from 'multer';              // Middleware for handling multipart/form-data (file uploads)
import path from 'path';                  // Node.js module for handling file paths
import { fileURLToPath } from 'url';      // Utility to convert ES module URL to file path

// Since __dirname is not available in ES modules, recreate it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage settings for uploaded files
const storage = multer.diskStorage({
  // Define the folder where uploaded files will be stored
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },

  // Define how the uploaded file should be named
  filename: (req, file, cb) => {
    // Generate a unique suffix using current timestamp + random number
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    // Save file with unique name + original file extension
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Filter files before uploading
const fileFilter = (req, file, cb) => {
  // Allow only image files (mimetype starts with "image/")
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);  // Accept file
  } else {
    cb(new Error('Only image files are allowed'), false); // Reject file
  }
};

// Create multer upload middleware with:

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB maximum file size
});

// Export the configured upload middleware for use in routes
export default upload;