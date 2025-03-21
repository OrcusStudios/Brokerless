const { body, validationResult } = require('express-validator');
const { AppError } = require('./errorMiddleware');

// Validation middleware helper
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        
        // If there are validation errors, create an AppError with the first error message
        return next(new AppError(errors.array()[0].msg, 400));
    };
};

// Validation rules
const validationRules = {
    registerUser: [
        body('name')
            .trim()
            .not().isEmpty().withMessage('Name is required')
            .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
        body('email')
            .trim()
            .isEmail().withMessage('Invalid email address')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
            .matches(/\d/).withMessage('Password must contain a number')
            .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    ],

    loginUser: [
        body('email')
            .trim()
            .isEmail().withMessage('Invalid email address')
            .normalizeEmail(),
        body('password')
            .not().isEmpty().withMessage('Password is required')
    ],

    updateProfile: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
        body('phoneNumber')
            .optional()
            .trim()
            .isMobilePhone().withMessage('Invalid phone number')
    ]
};

module.exports = {
    validate,
    validationRules
};