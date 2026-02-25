// // my-app/backend/src/services/photoService.js
// // src/services/photoService.js

// import fs from 'fs';
// import path from 'path';

// // Service to handle photo metadata and filesystem operations

// export const photoService = {
//   /**
//    * Generates the relative URL for database storage
//    * @param {Object} file - The file object from multer (req.file)
//    * @returns {string|null}
//    */
//   getRelativePath: (file) => {
//     if (!file) return null;
//     // Maps to the /uploads folder defined in your middleware
//     // return /uploads/${file.filename};
//     return `/uploads/${file.filename}`;
//   },

//   /**
//    * Deletes a file from the local filesystem
//    * Useful for cleaning up rejected reports or expired alerts
//    * @param {string} relativePath - The path stored in the DB
//    */
//   deleteLocalPhoto: (relativePath) => {
//     const fullPath = path.join(process.cwd(), relativePath);
//     if (fs.existsSync(fullPath)) {
//       fs.unlinkSync(fullPath);
//     }
//   }
// };


import path from 'path';

export const photoService = {
  getUrl: (filename) => {
    if (!filename) return null;
    return `/uploads/${filename}`;
  },

  getAbsolutePath: (filename) => {
    return path.join(process.cwd(), 'uploads', filename);
  },
};