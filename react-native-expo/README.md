# Notification Service Todo — React Native + Expo

A minimal todo app (add / toggle / delete, persisted with AsyncStorage) that
registers the device's **native** push token with a deployed
[Notification Service](https://notification-service.YOUR-SUBDOMAIN.workers.dev) instance so the backend
can push notifications to it later.

The "Enable Notifications" button:

1. Requests permission with `Notifications.requestPermissionsAsync()`.
2. Gets the **native device token** with `Notifications.getDevicePushTokenAsync()`
   — the APNs token (hex string) on iOS, the FCM token on Android. This is **not**
   the Expo push token (`ExponentPushToken[...]`).
3. Maps the platform to a Notification Service channel: `ios → apns`, `android → fcm`.
4. POSTs it to `<base>/v1/identify` with a Bearer token (see `src/notification-service.ts`).

## Important: native push needs a development build + real device

`getDevicePushTokenAsync()` returns a **native** APNs/FCM token, which is **not
available in Expo Go** and does **not** work on simulators/emulators for remote
push. You must run a **development build on a physical device**:

- **iOS** — requires an Apple Developer account and an APNs key configured for
  your bundle identifier. Run `npx expo run:ios` (or build a dev client with EAS)
  and install on a real iPhone.
- **Android** — requires Firebase Cloud Messaging. Create a Firebase project, add
  an Android app with package `com.example.notificationservicetodo`, download
  `google-services.json` into the project root (referenced from `app.json` as
  `android.googleServicesFile`), then `npx expo run:android` on a real device.
  With EAS, provide the FCM credentials via `eas credentials`.

## Run

```bash
npm install

# iOS (physical device, dev build)
npx expo run:ios

# Android (physical device, dev build; requires google-services.json)
npx expo run:android
```

Or build a development client with EAS and install it on device:

```bash
npx eas build --profile development --platform ios      # or android
```

## Configuration

Edit `src/config.ts`:

```ts
export const NOTIFICATION_SERVICE_BASE_URL = 'https://notification-service.YOUR-SUBDOMAIN.workers.dev';
export const NOTIFICATION_SERVICE_API_KEY  = 'YOUR_NOTIFICATION_SERVICE_API_KEY'; // put your key here
```

The `distinct_id` is a UUID generated on first launch and persisted in
AsyncStorage (`src/id.ts`).

## Security caveat

Notification Service authenticates with a **single instance-wide API key** as a bearer token.
**Do not ship that key inside a distributed client in production** — anyone can
extract it from the app bundle. This demo hardcodes a placeholder
`YOUR_NOTIFICATION_SERVICE_API_KEY` for convenience only. For production, front Notification Service with a
thin proxy that holds the key server-side, or add a per-device mint endpoint.

## File tree

```
react-native-expo/
├── App.tsx            # Todo UI + Enable Notifications flow
├── app.json           # Expo config: expo-notifications plugin, iOS/Android push
├── babel.config.js
├── index.ts           # registerRootComponent entry
├── package.json
├── tsconfig.json
└── src/
    ├── notification-service.ts  # registerDevice() → POST /v1/identify (Bearer auth)
    ├── config.ts                # NOTIFICATION_SERVICE_BASE_URL, NOTIFICATION_SERVICE_API_KEY
    └── id.ts                    # getOrCreateDistinctId() (UUID in AsyncStorage)
```
