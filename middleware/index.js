// middleware/index.js

const authMiddleware = require('./authMiddleware');
const errorMiddleware = require('./errorMiddleware');
const rateLimitMiddleware = require('./rateLimitMiddleware');
const sanitizationMiddleware = require('./sanitizationMiddleware');
const validationMiddleware = require('./validationMiddleware');
const requestLoggerMiddleware = require('./requestLoggerMiddleware');

module.exports = {
    auth: authMiddleware,
    error: errorMiddleware,
    rateLimit: rateLimitMiddleware,
    sanitize: sanitizationMiddleware,
    validate: validationMiddleware,
    logger: requestLoggerMiddleware
};