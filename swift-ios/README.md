# Notification Service Todo — Native iOS (Swift + SwiftUI)

A minimal SwiftUI todo app that also registers the device's **APNs push token**
with a deployed [Notification Service](../NOTIFICATION_SERVICE_INTEGRATION.md) instance, so the backend can
later push notifications to it.

- Add / toggle / delete todos, persisted to `UserDefaults`.
- An **Enable Notifications** button that requests permission, obtains the APNs
  device token, and `POST`s it to Notification Service's `/v1/identify` using channel `apns`.
- Live status banner: `Registered ✓` or the error.

Targets **iOS 16+**.

## Files

These are plain Swift source files (no `.xcodeproj` is committed — see below for
how to create the Xcode project). All live under `Sources/`:

| File | Purpose |
|------|---------|
| `NotificationServiceTodoApp.swift` | `@main` App entry point; wires in the AppDelegate via `@UIApplicationDelegateAdaptor`. |
| `AppDelegate.swift` | `UIApplicationDelegate` that receives `didRegisterForRemoteNotificationsWithDeviceToken` / `didFailToRegister`. |
| `PushRegistrationModel.swift` | `ObservableObject` shared between the AppDelegate and the UI; converts the token `Data` → lowercase hex and calls the client. Also holds the `Data.hexString` helper. |
| `NotificationServiceClient.swift` | `register(distinctId:apnsTokenHex:) async` — POSTs `/v1/identify` with Bearer auth. |
| `TodoStore.swift` | `TodoItem` model + `ObservableObject` list persisted to `UserDefaults`. |
| `TodoView.swift` | The SwiftUI screen (list + add field + Enable Notifications button). |
| `Config.swift` | Base URL, API key placeholder, and the persisted `distinct_id` UUID. |

## Configure

Open `Sources/Config.swift` and set your instance API key:

```swift
static let notificationServiceApiKey = "YOUR_NOTIFICATION_SERVICE_API_KEY"  // ← replace for local testing
```

The base URL is already set to the deployed instance:

```swift
static let notificationServiceBaseURL = "https://notification-service.YOUR-SUBDOMAIN.workers.dev"
```

`distinct_id` is a random `UUID` generated on first launch and stored in
`UserDefaults`, so it stays stable across relaunches.

## Create the Xcode project and add these files

We can't run Xcode's project generator here, so create the project manually — it
takes about a minute:

1. **New project:** Xcode → *File ▸ New ▸ Project…* → **iOS ▸ App** → *Next*.
   - Product Name: `NotificationServiceTodo`
   - Interface: **SwiftUI**, Language: **Swift**
   - Uncheck Core Data / Tests if you like. *Next* → choose a location → *Create*.
2. **Delete the auto-generated `ContentView.swift` and `NotificationServiceTodoApp.swift`**
   that Xcode created (move to Trash). You'll replace them with the files here.
3. **Add the source files:** drag every file from this repo's `Sources/` folder
   into the Xcode project navigator. In the dialog, tick **Copy items if needed**
   and make sure your app target is checked under *Add to targets*.
   - There is only one `@main` — the `NotificationServiceTodoApp.swift` in `Sources/`. Make
     sure you deleted Xcode's generated one so you don't have two.
4. **Set the deployment target** to iOS 16.0 or later (target ▸ *General ▸
   Minimum Deployments*).
5. **Add the Push Notifications capability:** select the target → *Signing &
   Capabilities* → *+ Capability* → **Push Notifications**.
6. **Signing:** under *Signing & Capabilities*, select your **Apple Developer
   team**. Push requires a paid Apple Developer account and a provisioning
   profile that includes the Push Notifications entitlement (Xcode manages this
   automatically once the capability is added and a team is selected).
7. **Build & run on a real device** (see below).

## Requirements to actually get a token

- A **paid Apple Developer account** (Push Notifications capability requires it).
- The **Push Notifications** capability enabled on the target (step 5).
- A **real, physical iOS device.** APNs remote push registration does **not**
  work on the iOS Simulator — `didFailToRegister` will fire there. The rest of
  the app (todos) works fine on the simulator; only token registration needs a
  device.

When you tap **Enable Notifications** on a real device and grant permission, the
APNs token arrives in `AppDelegate.didRegisterForRemoteNotificationsWithDeviceToken`,
is converted to a lowercase hex string, and POSTed to Notification Service. The banner shows
`Registered ✓` on success.

## Security caveat

Notification Service authenticates with a **single instance API key** as a bearer token. Do
**not** ship that key inside a distributed client in production — anyone can
extract it from the app binary. This demo hardcodes a placeholder
`YOUR_NOTIFICATION_SERVICE_API_KEY` for convenience only. For production, front Notification Service with a
thin proxy that holds the key server-side, or add a per-device mint endpoint. See
[`../NOTIFICATION_SERVICE_INTEGRATION.md`](../NOTIFICATION_SERVICE_INTEGRATION.md).
