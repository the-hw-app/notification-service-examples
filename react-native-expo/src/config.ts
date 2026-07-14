// Notification Service deployed instance configuration.
//
// SECURITY: The API key is a single instance-wide bearer token. Do NOT ship it
// inside a distributed client in production — anyone can extract it from the
// app bundle. This placeholder exists only for local demo convenience. For
// production, front Notification Service with a thin proxy that holds the key
// server-side, or add a per-device mint endpoint.

export const NOTIFICATION_SERVICE_BASE_URL = 'https://notification-service.YOUR-SUBDOMAIN.workers.dev';
export const NOTIFICATION_SERVICE_API_KEY = 'YOUR_NOTIFICATION_SERVICE_API_KEY';
