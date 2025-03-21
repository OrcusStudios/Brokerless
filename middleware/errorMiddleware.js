// middleware/errorMiddleware.js
const winston = require('winston');

// Custom format to filter out notification endpoint logs
const filterNotifications = winston.format((info) => {
    // If this is a string message (from console transport)
    if (typeof info.message === 'string' && 
        (info.message.includes('/notifications/unread/count') || 
         info.message.includes('/messages/unread/count'))) {
        return false; // Skip this log entry
    }
    
    // If this is an object message (from structured logging)
    if (info.url && 
        (info.url.includes('/notifications/unread/count') || 
         info.url.includes('/messages/unread/count'))) {
        return false; // Skip this log entry
    }
    
    return info;
})();

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        filterNotifications, // Add the filter before other formats
        winston.format.timestamp(),
        winston.format.printf(info => {
            // If it's an object with url property, format as HTTP request log
            if (info.url) {
                return `${info.timestamp} ${info.level}: ${info.ip} - - [${new Date(info.timestamp).toUTCString()}] "${info.method} ${info.url} HTTP/1.1" ${info.status || 200}`;
            }
            // Otherwise use standard format
            return `${info.timestamp} ${info.level}: ${info.message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// HTTP request logger middleware
const requestLogger = (req, res, next) => {
    // Skip logging for notification and message count endpoints
    if (!req.originalUrl.includes('/notifications/unread/count') && 
        !req.originalUrl.includes('/messages/unread/count')) {
        
        // Clone the response's end method
        const originalEnd = res.end;
        
        // Override the end method to capture the status code
        res.end = function(chunk, encoding) {
            // Restore the original end method
            res.end = originalEnd;
            
            // Log the HTTP request with status code
            logger.info({
                ip: req.ip,
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode,
                userAgent: req.get('User-Agent')
            });
            
            // Call the original end method
            res.end(chunk, encoding);
        };
    }
    
    next();
};

// Custom error class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
        
        // Add timestamp
        this.timestamp = new Date().toISOString();
    }
}

// 404 Not Found handler
const notFoundHandler = (req, res, next) => {
    const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
    next(err);
};

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
    // Set default values
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    // Log the error
    if (err.statusCode >= 500) {
        logger.error({
            message: `${err.statusCode} - ${err.message}`,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip
        });
    } else {
        logger.warn({
            message: `${err.statusCode} - ${err.message}`,
            url: req.originalUrl,
            method: req.method
        });
    }
    
    // Add timestamp if not present
    if (!err.timestamp) {
        err.timestamp = new Date().toISOString();
    }
    
    // Format error for display
    const formattedError = {
        statusCode: err.statusCode,
        status: err.status,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        isOperational: err.isOperational,
        level: err.statusCode >= 500 ? 'error' : 'warn',
        timestamp: new Date().toLocaleString()
    };
    
    // Determine error title based on status code
    let errorTitle;
    if (err.statusCode === 404) errorTitle = 'Page Not Found';
    else if (err.statusCode === 403) errorTitle = 'Access Denied';
    else if (err.statusCode === 401) errorTitle = 'Authentication Required';
    else if (err.statusCode >= 500) errorTitle = 'Server Error';
    else errorTitle = 'Request Error';
    
    // Respond based on request type and environment
    if (req.originalUrl.startsWith('/api')) {
        // API error response
        return res.status(err.statusCode).json(formattedError);
    } else {
        // Render error page for browser requests
        return res.status(err.statusCode).render('error', {
            title: errorTitle,
            statusCode: err.statusCode,
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : null,
            error: formattedError
        });
    }
};

// Utility function to wrap async controllers
const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

module.exports = {
    AppError,
    notFoundHandler,
    globalErrorHandler,
    catchAsync,
    logger,
    requestLogger // Export the request logger middleware
};