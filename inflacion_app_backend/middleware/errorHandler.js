export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Database errors
    if (err.code === '23505') {
        return res.status(409).json({
            message: 'El registro ya existe',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    if (err.code === '23503') {
        return res.status(400).json({
            message: 'Referencia inválida a otro registro',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Error de validación',
            errors: err.details,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            message: 'Token inválido',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            message: 'Token expirado',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Default error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message || 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

export const notFoundHandler = (req, res) => {
    res.status(404).json({
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
};
