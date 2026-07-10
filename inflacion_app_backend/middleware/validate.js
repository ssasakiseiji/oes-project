export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const error = new Error('Error de validación');
        error.name = 'ValidationError';
        error.statusCode = 400;
        error.details = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
        }));
        return next(error);
    }

    req.body = result.data;
    next();
};
