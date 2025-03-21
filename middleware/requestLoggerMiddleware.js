// requestLoggerMiddleware.js
const morgan = require('morgan');
const logger = require('./errorMiddleware').logger;

// Create the Morgan middleware with skip option
const requestLogger = morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    },
    skip: function (req, res) {
        // Skip logging for polling/status endpoints
        return req.path === '/messages/unread/count';
    }
});

module.exports = requestLogger;