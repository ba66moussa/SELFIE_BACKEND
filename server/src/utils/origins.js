export function allowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS || '';
  return env.split(',').map(s => s.trim()).filter(Boolean);
}
