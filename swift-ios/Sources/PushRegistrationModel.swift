import Foundation
import Combine

/// Observable status of the push-registration flow, shared between the AppDelegate
/// (which receives the APNs token callbacks) and the SwiftUI views (which display it).
@MainActor
final class PushRegistrationModel: ObservableObject {

    /// Singleton so the UIKit AppDelegate and the SwiftUI world share one instance.
    static let shared = PushRegistrationModel()

    enum Status: Equatable {
        case idle
        case requestingPermission
        case waitingForToken
        case registering
        case registered
        case denied
        case failed(String)

        var message: String {
            switch self {
            case .idle: return "Not registered"
            case .requestingPermission: return "Requesting permission…"
            case .waitingForToken: return "Waiting for APNs token…"
            case .registering: return "Registering with Notification Service…"
            case .registered: return "Registered ✓"
            case .denied: return "Notifications denied"
            case let .failed(reason): return "Error: \(reason)"
            }
        }
    }

    @Published private(set) var status: Status = .idle

    private init() {}

    func set(_ status: Status) {
        self.status = status
    }

    /// Called by the AppDelegate once APNs hands back a device token.
    func didReceiveAPNsToken(_ deviceToken: Data) {
        let hex = deviceToken.hexString
        set(.registering)
        Task {
            do {
                try await NotificationServiceClient.register(
                    distinctId: Config.distinctId,
                    apnsTokenHex: hex
                )
                set(.registered)
            } catch {
                set(.failed(error.localizedDescription))
            }
        }
    }

    /// Called by the AppDelegate if APNs registration fails.
    func didFailToRegister(_ error: Error) {
        set(.failed(error.localizedDescription))
    }
}

extension Data {
    /// Lowercase hex-string encoding of the raw bytes (APNs device token format).
    var hexString: String {
        map { String(format: "%02x", $0) }.joined()
    }
}
