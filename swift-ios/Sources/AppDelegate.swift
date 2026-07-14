import UIKit

/// UIKit application delegate, bridged into the SwiftUI app via
/// `@UIApplicationDelegateAdaptor`. It exists solely to receive the APNs
/// device-token callbacks, which are not surfaced through the SwiftUI lifecycle.
final class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        return true
    }

    /// APNs succeeded: convert the token Data to a lowercase hex string and register.
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            PushRegistrationModel.shared.didReceiveAPNsToken(deviceToken)
        }
    }

    /// APNs failed (no entitlement, no network, simulator, etc.).
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in
            PushRegistrationModel.shared.didFailToRegister(error)
        }
    }
}
