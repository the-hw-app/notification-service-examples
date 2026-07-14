import Foundation

/// App-wide configuration for the Notification Service integration.
///
/// SECURITY: `notificationServiceApiKey` is a single instance-wide bearer key. Do NOT ship a
/// real key inside a distributed client in production — anyone can extract it from
/// the app binary. Front Notification Service with a thin proxy that holds the key server-side,
/// or add a per-device mint endpoint. See README.md.
enum Config {
    /// Base URL of the deployed Notification Service instance (no trailing slash).
    static let notificationServiceBaseURL = "https://notification-service.YOUR-SUBDOMAIN.workers.dev"

    /// Placeholder API key. Replace with your instance key for local testing only.
    static let notificationServiceApiKey = "YOUR_NOTIFICATION_SERVICE_API_KEY"

    /// A stable per-device identifier sent as `distinct_id`. Generated once and
    /// persisted in UserDefaults so it survives app relaunches.
    static var distinctId: String {
        let key = "notificationService.distinctId"
        let defaults = UserDefaults.standard
        if let existing = defaults.string(forKey: key) {
            return existing
        }
        let fresh = UUID().uuidString
        defaults.set(fresh, forKey: key)
        return fresh
    }
}
