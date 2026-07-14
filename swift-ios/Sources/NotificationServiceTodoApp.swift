import SwiftUI

@main
struct NotificationServiceTodoApp: App {
    // Bridge in the UIKit AppDelegate so we can receive APNs device-token callbacks.
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            TodoView()
        }
    }
}
