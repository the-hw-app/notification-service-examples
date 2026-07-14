# Notification Service Flutter Todo

A minimal Flutter todo app (add / toggle / delete, persisted with
`shared_preferences`) that registers the device's **FCM push token** with a
deployed [Notification Service](https://notification-service.YOUR-SUBDOMAIN.workers.dev) backend so it can
later receive push notifications.

On both Android and iOS the token comes from
`FirebaseMessaging.instance.getToken()` and is sent to Notification Service on channel
`"fcm"`. On iOS, Firebase bridges FCM to APNs internally, so you still use the
`fcm` channel and the FCM token — not a raw APNs token.

## What's in this repo

This is a source-only project. It contains the Dart code and `pubspec.yaml` but
**not** the generated `android/` and `ios/` native folders. You generate those
with `flutter create .` (see below).

```
flutter-todo/
├── pubspec.yaml
├── analysis_options.yaml
├── README.md
└── lib/
    ├── main.dart                  # Material app, todo list, "Enable Notifications" flow
    ├── notification_service.dart  # registerDevice() → POST /v1/identify
    └── config.dart                # base URL + API key placeholder
```

## Prerequisites

- Flutter SDK (stable, 3.22+) and Dart 3.4+.
- A Firebase project.
- The FlutterFire CLI (`dart pub global activate flutterfire_cli`) and
  `npm i -g firebase-tools`, if you want `flutterfire configure` to generate the
  platform config for you.

## Setup

1. **Generate the platform folders** in this directory:

   ```bash
   cd flutter-todo
   flutter create .
   flutter pub get
   ```

   This creates `android/`, `ios/` (and optionally other platforms) without
   overwriting the existing `lib/` and `pubspec.yaml`.

2. **Add Firebase config.** Easiest path:

   ```bash
   flutterfire configure
   ```

   This writes `lib/firebase_options.dart`, plus the native
   `android/app/google-services.json` and
   `ios/Runner/GoogleService-Info.plist`.

   (If you configure manually instead of using `flutterfire configure`, drop
   `google-services.json` into `android/app/` and `GoogleService-Info.plist` into
   `ios/Runner/` yourself, and wire the Google services Gradle plugin.)

   > Note: `main.dart` calls `Firebase.initializeApp()` with no arguments, which
   > relies on the native config files. If you use `firebase_options.dart`, pass
   > `Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform)`.

3. **Set your Notification Service API key** in `lib/config.dart`:

   ```dart
   const String notificationServiceApiKey = "YOUR_NOTIFICATION_SERVICE_API_KEY";
   ```

   `notificationServiceBaseUrl` is already set to the deployed instance.

## iOS / APNs note

On iOS, FCM delivers through APNs. In addition to the steps above you must:

- Enable **Push Notifications** and **Background Modes → Remote notifications**
  capabilities in Xcode for the `Runner` target.
- Upload your **APNs authentication key** (or certificate) to the Firebase
  console (Project Settings → Cloud Messaging).
- Run on a **real device** — the iOS simulator cannot receive push tokens.

`FirebaseMessaging.instance.requestPermission()` triggers the iOS permission
prompt and lets Firebase set up the APNs bridge; `getToken()` then returns the
FCM token you register on channel `"fcm"`.

## Run

```bash
flutter run
```

Then in the app: add a few todos, tap **Enable Notifications**, grant the
permission prompt. The app obtains the FCM token and POSTs it to
`<base>/v1/identify`; the status line shows "Registered with Notification Service ✓" on
success. `onTokenRefresh` re-registers automatically when Firebase rotates the
token, and `FirebaseMessaging.onMessage` shows a snackbar for foreground pushes.

## Security caveat

Notification Service authenticates with a **single instance-wide API key** as a bearer token.
Do **not** ship that key inside a distributed client in production — anyone can
extract it from the app binary. This demo hardcodes a placeholder
`YOUR_NOTIFICATION_SERVICE_API_KEY` for convenience. For production, front Notification Service with a thin
proxy that holds the key server-side, or add a per-device mint endpoint.
