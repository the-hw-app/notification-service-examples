/// Notification Service backend configuration.
///
/// SECURITY: `notificationServiceApiKey` is a single instance-wide bearer token. Do NOT ship
/// it inside a distributed client in production — anyone can extract it from the
/// app binary. For production, front Notification Service with a thin proxy that holds the key
/// server-side, or add a per-device mint endpoint. This placeholder exists only
/// so the demo runs end-to-end.
library;

/// Base URL of the deployed Notification Service instance (no trailing slash).
const String notificationServiceBaseUrl = "https://notification-service.YOUR-SUBDOMAIN.workers.dev";

/// Replace with your Notification Service instance API key.
const String notificationServiceApiKey = "YOUR_NOTIFICATION_SERVICE_API_KEY";
