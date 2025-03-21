// sanitizationMiddleware.js
const sanitizeHtml = require('sanitize-html');

const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeHtml(obj[key], {
                    allowedTags: [],
                    allowedAttributes: {}
                });
            } else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
            }
        }
    };

    sanitize(req.body);
    sanitize(req.query);
    next();
};

module.exports = sanitizeInput;