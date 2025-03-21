const fileUpload = require('express-fileupload');

// File upload middleware
const fileUploadMiddleware = fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  abortOnLimit: true
});

module.exports = {
    fileUploadMiddleware
};