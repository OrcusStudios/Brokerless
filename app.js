const express = require("express");
const path = require("path");
const http = require('http');
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/User");
const Professional = require("./models/Professional");
const bcrypt = require("bcryptjs");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const flash = require('express-flash');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const messagingService = require('./utils/messagingService');
const sanitizeInput = require('./middleware/sanitizationMiddleware');
const { loginLimiter, apiLimiter, createAccountLimiter } = require('./middleware/rateLimitMiddleware');
const { unreadMessageCount } = require('./middleware/messageMiddleware');
const app = express();


// Security Middleware
app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Scripts - Add unsafe-eval for WebAssembly
          scriptSrc: [
            "'self'", 
            "'unsafe-inline'",
            "'unsafe-eval'", // Add this for WebAssembly
            "cdn.jsdelivr.net", 
            "https://maps.googleapis.com",
            "https://*.gstatic.com", // Add this for Google Maps
            "https://cdnjs.cloudflare.com"
          ],
          // Workers - Add Google domains
          workerSrc: ["'self'", "blob:", "https://*.googleapis.com", "https://*.gstatic.com"],
          // Child sources - Add Google domains
          childSrc: ["'self'", "blob:", "https://*.googleapis.com", "https://*.gstatic.com"],
          // Styles
          styleSrc: [
            "'self'", 
            "'unsafe-inline'", 
            "cdn.jsdelivr.net", 
            "fonts.googleapis.com",
            "https://*.gstatic.com" // Add this for Google Maps
          ],
          // Fonts
          fontSrc: [
            "'self'", 
            "fonts.gstatic.com", 
            "cdn.jsdelivr.net"
          ],
          // Images - Make sure blob: is included
          imgSrc: [
            "'self'", 
            "data:", 
            "blob:",  // Explicitly add blob:
            "res.cloudinary.com", 
            "*.googleapis.com",
            "*.gstatic.com", // Add this for Google Maps
            "*" 
          ],
          // Connect - Add data: for Google Maps
          connectSrc: [
            "'self'", 
            "maps.googleapis.com",
            "*.googleapis.com",
            "*.gstatic.com", // Add this for Google Maps
            "data:" // Add this for Google Maps data URIs
          ],
          // Frame sources
          frameSrc: ["'self'", "https://www.google.com"],
          // Other directives remain the same
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          manifestSrc: ["'self'"],
        },
      },
      // Other security headers
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    })
  );

// Rate Limiting
const limiter = rateLimit({
    max: 100, // limit each IP to 100 requests per windowMs
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests from this IP, please try again in 15 minutes'
});
app.use('/api', limiter); // Apply to API routes

// Existing Middleware (keep your existing setup)
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(cookieParser());

// Add request logging middleware
app.use(sanitizeInput);
// Apply rate limiting to specific routes
app.use('/users/login', loginLimiter);
app.use('/users/register', createAccountLimiter);
app.use('/professionals/register', createAccountLimiter);
app.use('/api', apiLimiter);


// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "secretkey",
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));
app.use(flash());

passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
        let user = await User.findOne({ email });

        if (!user) {
            user = await Professional.findOne({ email }); // Check Professionals if not found in Users
            if (!user) {
                return done(null, false, { message: "Incorrect email." });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, { id: user.id, type: user.professionalType ? "Professional" : "User" });
});

passport.deserializeUser(async (obj, done) => {
    try {
        let user;
        if (obj.type === "Professional") {
            user = await Professional.findById(obj.id);
        } else {
            user = await User.findById(obj.id);
        }
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Passport Middleware (your existing setup)
app.use(passport.initialize());
app.use(passport.session());

app.use(unreadMessageCount);

// Global Locals Middleware
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.info = req.flash("info");
    res.locals.user = req.user;
    next();
});

// Add CORS protection
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use("/users", require("./routes/userRoutes"));
app.use("/listings", require("./routes/propertyRoutes"));
app.use("/offers", require("./routes/offerRoutes"));
app.use("/messages", require("./routes/messageRoutes"));
app.use("/schedule", require("./routes/scheduleRoutes"));
app.use("/professionals", require("./routes/professionalRoutes"));
app.use("/lender", require("./routes/lenderRoutes"));
app.use("/filter", require("./routes/filterRoutes"));
app.use("/lenderDirectory", require("./routes/directoryRoutes"));
app.use("/pre-Approval", require("./routes/preapprovalRoutes")); 
app.use("/notifications", require("./routes/notificationRoutes"));
app.use("/api", require("./routes/apiRoutes"));
app.use("/messages", require("./routes/messageRoutes"));
app.use("/closing", require("./routes/closingRoutes"));
app.use("/pricing", require("./routes/pricingRoutes"));
app.use("/disclosures", require("./routes/disclosureRoutes"));

// Home Route
app.get('/', (req, res) => {
    res.render('index');
});

// Catch-all route for undefined routes
app.use((req, res, next) => {
    // Create a new AppError with a 404 status
    const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
    
    // Pass the error to the next middleware (which will be the global error handler)
    next(err);
});

// Import Error Handling
const { 
    globalErrorHandler, 
    notFoundHandler, 
    AppError, 
    logger,
    requestLogger 
} = require('./middleware/errorMiddleware');

app.use(requestLogger);

// 404 Handler - Place BEFORE global error handler
app.use(notFoundHandler);

// Global Error Handler - MUST be the last middleware
app.use(globalErrorHandler);

// MongoDB Connection with Error Handling
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info('✅ MongoDB Connected'))
    .catch(err => {
        logger.error('❌ MongoDB Connection Error:', err);
        process.exit(1); // Exit process on fatal error
    });

mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('Lost MongoDB connection');
});

// Start Server

const server = http.createServer(app);
const io = messagingService.init(server);

// Optional: Handle server startup errors
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
});

// Keep the error handling:
server.on('error', (error) => {

    console.error('Server error:', error);
    console.log('Server running on port 3000');
});

module.exports = app;