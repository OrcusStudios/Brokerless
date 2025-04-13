// rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs, // 15 minutes
        max, // limit each IP to X requests per windowMs
        message,
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });
};

// For testing purposes, we're setting very high limits
module.exports = {
    loginLimiter: createLimiter(5 * 60 * 1000, 1000, 'Too many login attempts, please try again later'),
    professionalLoginLimiter: createLimiter(5 * 60 * 1000, 1000, 'Too many login attempts, please try again later'),
    apiLimiter: createLimiter(15 * 60 * 1000, 1000, 'Too many requests, please try again later'),
    createAccountLimiter: createLimiter(60 * 60 * 1000, 1000, 'Too many accounts created, please try again later')
};
