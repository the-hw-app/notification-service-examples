# Notification Service Todo — Native Android (Kotlin + Jetpack Compose)

A minimal todo app that also registers the device's **Firebase Cloud Messaging
(FCM)** push token with a deployed [Notification Service](https://notification-service.YOUR-SUBDOMAIN.workers.dev)
instance, so the backend can later push notifications to it.

This is the Kotlin/Android member of the shared demo set. See
[`../NOTIFICATION_SERVICE_INTEGRATION.md`](../NOTIFICATION_SERVICE_INTEGRATION.md) for the cross-platform
contract. Android uses channel `fcm` with the token from
`FirebaseMessaging.getInstance().token`.

## What it does

- **Todo list**: add, toggle done, delete. Persisted in `SharedPreferences`, so
  the list survives relaunches.
- **Enable notifications** button:
  1. On Android 13+ (API 33) requests the `POST_NOTIFICATIONS` runtime permission.
  2. Fetches the FCM registration token.
  3. `POST`s it to Notification Service's `/v1/identify` and shows the result.
- **`MyFirebaseMessagingService`**: re-registers on token refresh (`onNewToken`)
  and posts a local notification for incoming pushes (`onMessageReceived`).

## Prerequisites

- **Android Studio** (Ladybug / 2024.2 or newer recommended) with an Android SDK
  for API 34.
- **JDK 17** (bundled with recent Android Studio).
- **A Firebase project** of your own, plus its `google-services.json` — see below.

### Firebase config (`google-services.json`) — required

The build will **not** compile without it, and it is **not** included here (it is
project-specific and git-ignored). Do not invent one.

1. Open the [Firebase console](https://console.firebase.google.com) and create or
   pick a project.
2. Add an **Android app** with package name **`com.example.notificationservicetodo`** (must
   match `applicationId` / `namespace` in [`app/build.gradle.kts`](app/build.gradle.kts)).
3. Download `google-services.json`.
4. Place it at **`app/google-services.json`**.

See [`app/google-services.json.placeholder`](app/google-services.json.placeholder)
for the same steps next to where the file goes.

To actually receive pushes you also need Firebase Cloud Messaging enabled on that
project, and Notification Service must be configured with the matching FCM/service-account
credentials on the server side.

## Configure the API key

Open [`app/src/main/java/com/example/notificationservicetodo/Config.kt`](app/src/main/java/com/example/notificationservicetodo/Config.kt)
and replace the placeholder:

```kotlin
const val NOTIFICATION_SERVICE_BASE_URL = "https://notification-service.YOUR-SUBDOMAIN.workers.dev"
const val NOTIFICATION_SERVICE_API_KEY  = "YOUR_NOTIFICATION_SERVICE_API_KEY"   // <-- put your instance key here
```

`distinct_id` is a UUID generated once and persisted in `SharedPreferences`.

## Run

1. Place `app/google-services.json` (above) and set `NOTIFICATION_SERVICE_API_KEY`.
2. Open the `kotlin-android/` folder in Android Studio and let it sync Gradle.
   (Or from a full checkout with a Gradle wrapper: `./gradlew :app:installDebug`.)
3. Run the app on an emulator or device (Android 8.0+ recommended; `minSdk` is 24).
4. Tap **Enable notifications**, accept the permission, and watch for
   "Registered with Notification Service."
5. Send a test message from the Firebase console (or via Notification Service) to see a
   notification.

> Note: FCM push delivery does not work on emulators without Google Play services.
> Use an emulator image that includes the Play Store, or a physical device.

## Project layout

```
kotlin-android/
├── settings.gradle.kts
├── build.gradle.kts            # plugin versions (AGP, Kotlin, Compose, google-services)
├── gradle.properties
├── gradle/wrapper/gradle-wrapper.properties
└── app/
    ├── build.gradle.kts        # Compose + Firebase Messaging dependencies
    ├── google-services.json    # YOU add this (git-ignored)
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/example/notificationservicetodo/
        │   ├── MainActivity.kt              # Compose UI + Enable-notifications flow
        │   ├── NotificationServiceClient.kt             # POST /v1/identify (HttpURLConnection)
        │   ├── MyFirebaseMessagingService.kt# onNewToken / onMessageReceived
        │   ├── Notifications.kt             # notification channel
        │   ├── Config.kt                    # base URL, API key, distinct_id
        │   ├── TodoStore.kt                 # SharedPreferences persistence
        │   └── ui/theme/                    # Material3 theme
        └── res/
            ├── values/{strings,themes,colors}.xml
            ├── drawable/ic_launcher_*.xml
            ├── mipmap-anydpi-v26/ic_launcher*.xml
            └── mipmap/ic_launcher*.xml
```

## Security caveat (from the shared contract)

Notification Service authenticates with a **single instance API key** as a bearer token. Do
**not** ship that key inside a distributed client in production — anyone can
extract it from the APK. This demo hardcodes the placeholder
`YOUR_NOTIFICATION_SERVICE_API_KEY` for convenience only. For production, front Notification Service with a
thin proxy that holds the key server-side, or add a per-device mint endpoint.
