import { ZodError } from 'zod';

export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        console.error('[VALIDATION ERROR]', JSON.stringify(err.issues, null, 2));
        return res.status(400).json({
          message: 'Validation failed',
          errors: (err.errors || err.issues || []).map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(err);
    }
  };
};
