export function notFound(req, res, next) {
  const err = new Error(`Not found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

export function errorHandler(err, req, res, next) { // eslint-disable-line
  const status = err.status || 500;
  const payload = {
    error: {
      message: err.message || 'Unexpected error',
      ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    }
  };
  res.status(status).json(payload);
}
