// ============================================
// Error Handler Middleware
// ============================================

/**
 * Centralized error handler. Catches all errors
 * thrown in routes and returns a consistent JSON response.
 */
function errorHandler(err, req, res, _next) {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message);

    const statusCode = err.statusCode || 500;
    const response = {
        error: err.name || 'InternalServerError',
        message: err.message || 'An unexpected error occurred',
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

/**
 * Create an error with a status code.
 */
function createError(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

module.exports = { errorHandler, createError };
