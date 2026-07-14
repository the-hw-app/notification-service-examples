# Notification Service .NET MAUI Todo

A minimal .NET MAUI todo app (add / toggle / delete, persisted with
`Microsoft.Maui.Storage.Preferences` as JSON) that registers the device's **FCM
push token** with a deployed [Notification Service](https://notification-service.YOUR-SUBDOMAIN.workers.dev)
backend so it can later receive push notifications.

On both Android and iOS the token comes from
`CrossFirebaseCloudMessaging.Current.GetTokenAsync()` (Plugin.Firebase) and is
sent to the Notification Service on channel `"fcm"`. On iOS, Firebase bridges FCM
to APNs internally, so you still use the `fcm` channel and the FCM token — not a
raw APNs token. This mirrors the sibling Flutter app.

## What's in this repo

This is a **source-only** project. It contains the C#/XAML code and the
`.csproj`, but **not** the developer-supplied Firebase config files
(`google-services.json`, `GoogleService-Info.plist`) — you add those yourself
(they are git-ignored).

```
dotnet-maui/
├── NotificationServiceTodoMaui.csproj  # net9.0-android;net9.0-ios, Plugin.Firebase refs
├── MauiProgram.cs              # DI wiring + Plugin.Firebase init (RegisterFirebaseServices)
├── App.xaml / App.xaml.cs      # Application, merged resource dictionaries
├── AppShell.xaml / .cs         # Shell hosting MainPage (resolved via DI)
├── MainPage.xaml / .cs         # Todo UI + "Enable Notifications" + completion event
├── Models/
│   └── TodoItem.cs             # id / title / done, JSON-serialized
├── Services/
│   ├── NotificationServiceClient.cs  # POST /v1/identify and POST /v1/ingest
│   └── Config.cs               # base URL, API key, persisted DistinctId (Guid)
├── Platforms/
│   ├── Android/                # MainActivity, MainApplication, AndroidManifest.xml
│   └── iOS/                    # AppDelegate, Program.cs, Info.plist
├── Resources/                  # app icon, splash, color/style dictionaries
└── .gitignore
```

## Two backend touchpoints

1. **"Enable Notifications"** button → requests notification permission →
   `CrossFirebaseCloudMessaging.Current.CheckIfValidAsync()` /
   `GetTokenAsync()` → `NotificationServiceClient.RegisterDeviceAsync()` → `POST /v1/identify`
   with body `{ distinct_id, properties:{ app:"dotnet-maui" }, device:{ channel:"fcm", token } }`.
2. **Marking a todo complete** (checkbox → done) → `NotificationServiceClient.IngestEventAsync()`
   → `POST /v1/ingest` with `event:"todo_completed"` and
   `properties:{ title, app:"dotnet-maui", id }`. The Notification Service matches the
   `todo_completed` notification and pushes a confirmation back to every device
   this `distinct_id` registered. Toggling a todo **back to not-done sends
   nothing.**

Both flows surface status/result in the UI.

## Prerequisites

- **.NET 9 SDK** and the MAUI workload:

  ```bash
  dotnet workload install maui
  ```

- A **Firebase project** that supplies the native config:
  - `google-services.json` (Android) → place at `Platforms/Android/google-services.json`
  - `GoogleService-Info.plist` (iOS) → place at `Platforms/iOS/GoogleService-Info.plist`

  Both are git-ignored and referenced conditionally by the `.csproj`
  (`GoogleServicesJson` / `BundleResource`). The **package name / bundle id** in
  those files must match `<ApplicationId>com.notificationservice.tododemo</ApplicationId>` in
  `NotificationServiceTodoMaui.csproj` — change all three to your own id.

- [Plugin.Firebase](https://github.com/TobiasBuchholz/Plugin.Firebase) is
  referenced via NuGet (`Plugin.Firebase` + `Plugin.Firebase.CloudMessaging`,
  current stable). Firebase is initialized in `MauiProgram.RegisterFirebaseServices`
  through MAUI lifecycle events (`CrossFirebase.Initialize(...)`), and Cloud
  Messaging is initialized in `Platforms/iOS/AppDelegate.cs`
  (`FirebaseCloudMessagingImplementation.Initialize()`).

## Set your Notification Service API key

In `Services/Config.cs`:

```csharp
public const string NotificationServiceApiKey = "YOUR_NOTIFICATION_SERVICE_API_KEY";
```

`NotificationServiceBaseUrl` is already set to the deployed instance
(`https://notification-service.YOUR-SUBDOMAIN.workers.dev`).

## Run

Android (device or emulator with Google Play services):

```bash
dotnet build -t:Run -f net9.0-android
```

iOS (real device required — the simulator cannot obtain push tokens):

```bash
dotnet build -t:Run -f net9.0-ios
```

Then in the app: add a few todos, tap **Enable Notifications**, and grant the
permission prompt. The app obtains the FCM token and POSTs it to
`<base>/v1/identify`; the status line shows "Registered with Notification Service ✓" on
success. `TokenChanged` re-registers automatically when Firebase rotates the
token, and `NotificationReceived` shows an alert for foreground pushes. Tick a
todo's checkbox to fire `todo_completed` and receive the confirmation push back.

## iOS / APNs note

On iOS, FCM delivers **through APNs**. In addition to the steps above you must:

- Enable the **Push Notifications** capability and **Background Modes → Remote
  notifications** for the app target. `Platforms/iOS/Info.plist` already sets
  `aps-environment` (`development`; use `production` for release/TestFlight) and
  `UIBackgroundModes` = `remote-notification`.
- Upload your **APNs authentication key** (or certificate) to the Firebase
  console (Project Settings → Cloud Messaging).
- Run on a **real device**.

`CheckIfValidAsync()` triggers the iOS permission prompt and lets Firebase set up
the APNs bridge; `GetTokenAsync()` then returns the FCM token you register on
channel `"fcm"`. Firebase's default method swizzling forwards the APNs device
token automatically, so no manual `RegisteredForRemoteNotifications` handling is
needed.

## Security caveat

The Notification Service authenticates with a **single instance-wide API key** as
a bearer token. Do **not** ship that key inside a distributed client in
production — anyone can extract it from the app binary. This demo hardcodes a
placeholder `YOUR_NOTIFICATION_SERVICE_API_KEY` for convenience. For production,
front the Notification Service with a thin proxy that holds the key server-side,
or add a per-device mint endpoint.
