const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    } 
    
    req.flash("error", "You must be logged in to access this page.");
    res.redirect("/users/login");
};

// Updated to handle multi-role user model
const ensureRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            req.flash("error", "Please log in to access this page");
            return res.redirect("/users/login");
        }

        // For professional users (who don't have roles array)
        if (req.user.professionalType) {
            // Professionals cannot access buyer/seller routes
            if (requiredRole === "buyer" || requiredRole === "seller") {
                req.flash("error", "You don't have permission to access this page");
                return res.redirect("/professionals/dashboard");
            }
            
            // Match professional role (if needed)
            const professionalRole = req.user.professionalType.toLowerCase();
            if (requiredRole === professionalRole) {
                return next();
            }
        }
        
        // For buyers/sellers (with roles array)
        if (req.user.roles && Array.isArray(req.user.roles)) {
            // Check if user has the required role and it's active
            const hasRole = req.user.roles.some(role => 
                role.type === requiredRole && role.active
            );
            
            if (hasRole) {
                return next();
            }
        }
        
        // Fallback for users with old model (single role)
        if (req.user.role === requiredRole) {
            return next();
        }
        
        req.flash("error", "You don't have permission to access this page");
        return res.redirect("/users/dashboard");
    };
};

const ensureAnyRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            req.flash("error", "Please log in to access this page");
            return res.redirect("/users/login");
        }

        // For professional users
        if (req.user.professionalType) {
            const professionalRole = req.user.professionalType.toLowerCase();
            if (allowedRoles.includes(professionalRole)) {
                return next();
            }
        }
        
        // For buyers/sellers (with roles array)
        if (req.user.roles && Array.isArray(req.user.roles)) {
            // Check if user has any of the allowed roles and it's active
            const hasAnyRole = req.user.roles.some(role => 
                allowedRoles.includes(role.type) && role.active
            );
            
            if (hasAnyRole) {
                return next();
            }
        }
        
        // Fallback for users with old model
        if (allowedRoles.includes(req.user.role)) {
            return next();
        }
        
        req.flash("error", "You don't have permission to access this page");
        return res.redirect("/users/dashboard");
    };
};

const ensureProfessional = (req, res, next) => {
    if (req.isAuthenticated() && req.user.professionalType) {
        return next();
    }
    req.flash("error", "Access denied. Please log in as a professional.");
    res.redirect("/users/login");
};

const ensureLender = (req, res, next) => {
    if (req.user && req.user.professionalType === "lender") {
      return next();
    }
    req.flash("error", "Access denied. You need to be a lender.");
    res.redirect("/professionals/dashboard");
  };

  const ensureTitleCompany = (req, res, next) => {
    if (req.user && req.user.professionalType === "title") {
        return next();
    }
    req.flash("error", "Access denied. You need to be a title company representative.");
    res.redirect("/professionals/dashboard");
};

const ensureInspector = (req, res, next) => {
    if (req.user && req.user.professionalType === "inspector") {
        return next();
    }
    req.flash("error", "Access denied. You need to be an inspector.");
    res.redirect("/professionals/dashboard");
};

const ensurePhotographer = (req, res, next) => {
    if (req.user && req.user.professionalType === "photographer") {
        return next();
    }
    req.flash("error", "Access denied. You need to be a photographer.");
    res.redirect("/professionals/dashboard");
};

const ensureContractor = (req, res, next) => {
    if (req.user && req.user.professionalType === "contractor") {
        return next();
    }
    req.flash("error", "Access denied. You need to be a contractor.");
    res.redirect("/professionals/dashboard");
};
  
module.exports = { 
    ensureAuthenticated, 
    ensureRole, 
    ensureProfessional, 
    ensureLender, 
    ensureTitleCompany, 
    ensureInspector, 
    ensurePhotographer, 
    ensureContractor,
    ensureAnyRole 
};
