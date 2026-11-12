export function fail(res, code, message, extra = {}) {
  return res.status(code).json({ error: message, ...extra });
}

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
