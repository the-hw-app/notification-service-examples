# Notification Service Todo — Capacitor + Next.js

A minimal but complete todo app (add / toggle / delete, persisted in
`localStorage`) that also registers the device's **push token** with a deployed
[Notification Service](https://notification-service.YOUR-SUBDOMAIN.workers.dev) instance so the backend
can push notifications to it later.

It runs two ways from a single codebase:

- **Web / PWA** — uses `ServiceWorkerRegistration.pushManager.subscribe()` with a
  VAPID public key and registers a `webpush` device.
- **Native (iOS / Android via Capacitor)** — uses
  `@capacitor/push-notifications`, listens for the `registration` event, and
  registers an `apns` (iOS) or `fcm` (Android) device.

The "Enable Notifications" button branches on `Capacitor.isNativePlatform()` and
picks the right path automatically.

## Project layout

```
app/
  layout.tsx        Root layout
  page.tsx          Todo UI + notification enable logic (client component)
  globals.css       Styles
lib/
  notification-service.ts  registerNative() / registerWebPush() → POST /v1/identify
  config.ts         Base URL, API key, VAPID key, distinct_id, base64 helper
public/
  sw.js             Service worker with a `push` handler
capacitor.config.ts Capacitor config (webDir: "out")
next.config.mjs     Next.js static export config (output: "export")
```

## Configuration

Edit `lib/config.ts`:

| Constant                        | What it is                                                          |
| ------------------------------- | ------------------------------------------------------------------ |
| `NOTIFICATION_SERVICE_BASE_URL` | Deployed instance URL (pre-filled).                                |
| `NOTIFICATION_SERVICE_API_KEY`  | Instance bearer token — replace `YOUR_NOTIFICATION_SERVICE_API_KEY`.|
| `VAPID_PUBLIC_KEY`              | Web Push public key — replace `YOUR_VAPID_PUBLIC_KEY`.             |

The `distinct_id` is a UUID generated on first run and persisted in
`localStorage`, so each device/browser gets a stable id.

### Minting a VAPID key (web path only)

Ask your Notification Service instance to generate a Web Push key pair:

```bash
curl -X POST https://notification-service.YOUR-SUBDOMAIN.workers.dev/v1/channels/webpush/keys \
  -H "Authorization: Bearer YOUR_NOTIFICATION_SERVICE_API_KEY"
```

Copy the returned **public** key into `VAPID_PUBLIC_KEY` in `lib/config.ts`. The
private key stays server-side on Notification Service.

## Run on the web

```bash
npm install
npm run dev
```

Open http://localhost:3000. Web Push requires a secure context — `localhost` is
treated as secure, but any other host needs HTTPS. Click **Enable
Notifications**, allow the browser prompt, and the app subscribes and POSTs the
`webpush` subscription to Notification Service.

## Build + add native platforms

Static export first, then let Capacitor wrap the built site:

```bash
npm run build          # Next.js static export → out/
npx cap add ios        # first time only
npx cap add android    # first time only
npx cap sync           # copy web assets + native plugins into the platforms
```

Then open the native project:

```bash
npx cap open ios       # Xcode
npx cap open android   # Android Studio
```

`npm run cap:sync` is a shortcut for `next build && npx cap sync`.

### Native push prerequisites

Native push notifications need real credentials — the demo code is complete, but
the platforms must be configured:

- **Android (FCM):** create a Firebase project, add an Android app, and drop the
  generated `google-services.json` into `android/app/`. Firebase Cloud Messaging
  supplies the `fcm` token.
- **iOS (APNs):** enable the **Push Notifications** capability in Xcode, run on a
  real device (the simulator can't get an APNs token), and configure an APNs key
  in your Apple Developer account. The `registration` event yields the `apns`
  device token.

## Security note

Notification Service authenticates with a **single instance API key** used as a bearer token.
Do **not** ship that key inside a distributed client in production — anyone can
extract it from the app bundle. This demo hardcodes a placeholder
`YOUR_NOTIFICATION_SERVICE_API_KEY` for convenience only. For production, front Notification Service with a
thin proxy that holds the key server-side, or add a per-device mint endpoint so
clients never carry the instance key.
