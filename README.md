# Notification Service — Example Client Apps

Minimal **todo apps** across six mobile/web frameworks, each showing how to
integrate with a [Notification Service](https://github.com/the-hw-app/notification-service)
instance: register a device's push token, and send an event when the user
completes a todo so the backend can push a notification back.

## The examples

| Directory | Framework | Push channel | Token source |
|-----------|-----------|--------------|--------------|
| [`swift-ios`](swift-ios) | Swift + SwiftUI | `apns` | APNs device token |
| [`kotlin-android`](kotlin-android) | Kotlin + Jetpack Compose | `fcm` | Firebase Cloud Messaging |
| [`react-native-expo`](react-native-expo) | React Native + Expo | `apns` / `fcm` | native device push token |
| [`flutter-todo`](flutter-todo) | Flutter | `fcm` | `firebase_messaging` |
| [`capacitor-nextjs`](capacitor-nextjs) | Capacitor + Next.js | `apns` / `fcm` / `webpush` | native push or Web Push |
| [`dotnet-maui`](dotnet-maui) | .NET MAUI | `fcm` | Plugin.Firebase |

Each app is the same minimal todo list (add / complete / delete) plus an
**"Enable Notifications"** button. See the shared contract in
[`NOTIFICATION_SERVICE_INTEGRATION.md`](NOTIFICATION_SERVICE_INTEGRATION.md).

## What every app does

1. On **Enable Notifications** → requests permission, obtains the push token,
   and registers it via `POST /v1/identify`.
2. On **completing a todo** → sends `POST /v1/ingest` with a `todo_completed`
   event, which the backend matches to a notification and pushes back.

## Before you run

Each app has its own README with framework-specific setup. In every case you'll
need to fill in a few placeholders in the app's config:

- **`NOTIFICATION_SERVICE_BASE_URL`** — your deployed instance
  (`https://notification-service.YOUR-SUBDOMAIN.workers.dev`).
- **`NOTIFICATION_SERVICE_API_KEY`** — your instance's API key. ⚠️ Don't ship a
  real key in a distributed client in production; front the service with a proxy.
- **Firebase / APNs config** — supply your own `google-services.json` (Android),
  `GoogleService-Info.plist` (iOS), or VAPID key (Web Push). These are
  intentionally **not** committed.

## License

Released under the [MIT License](LICENSE).
