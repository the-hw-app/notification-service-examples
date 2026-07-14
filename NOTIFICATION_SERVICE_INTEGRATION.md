# Notification Service integration contract (shared by all 5 apps)

Every app in this folder is a **simple todo app** that also **registers the device's
push token** with a deployed Notification Service instance so the backend can later push
notifications to it.

## Deployed instance

```
Base URL: https://notification-service.YOUR-SUBDOMAIN.workers.dev
```

## The one call every app makes

`POST /v1/identify`

Headers:

```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

Body:

```jsonc
{
  "distinct_id": "user-abc",          // stable per-user/device id you choose
  "properties": { "app": "swift" },   // optional, merges server-side
  "device": {
    "channel": "fcm" | "apns" | "webpush",
    "token": "<push token>",          // fcm/apns only
    "subscription": {                 // webpush only
      "endpoint": "https://...",
      "keys": { "p256dh": "...", "auth": "..." }
    }
  }
}
```

Success: `200 { "ok": true }`. On a webpush device with no `subscription`, or
fcm/apns with no `token`, you get `400`.

## Channel per platform

| App | Runtime | channel | token source |
|-----|---------|---------|--------------|
| Swift | iOS | `apns` | APNs device token (hex string) from `didRegisterForRemoteNotifications` |
| Kotlin | Android | `fcm` | `FirebaseMessaging.getInstance().token` |
| React Native + Expo | iOS/Android | `apns` / `fcm` | `Notifications.getDevicePushTokenAsync()` (native device token, NOT the Expo push token) |
| Flutter | iOS/Android | `fcm` | `FirebaseMessaging.instance.getToken()` (Firebase relays to APNs on iOS) |
| Capacitor + Next.js | native | `apns` / `fcm` | `@capacitor/push-notifications` `registration` event |
| Capacitor + Next.js | web/PWA | `webpush` | `ServiceWorkerRegistration.pushManager.subscribe()` |
| .NET MAUI | iOS/Android | `fcm` | Plugin.Firebase `CrossFirebaseCloudMessaging.GetTokenAsync()` (Firebase relays to APNs on iOS) |

## Security note (put in each README)

Notification Service authenticates with a **single instance API key** as a bearer token. Do
**not** ship that key inside a distributed client in production — anyone can
extract it. These demos hardcode a placeholder `YOUR_NOTIFICATION_SERVICE_API_KEY` for
convenience. For production, front Notification Service with a thin proxy that holds the key
server-side, or add a per-device mint endpoint.

## Sending events (the user action)

When the user **marks a todo complete**, the app fires an event to Notification Service:

`POST /v1/ingest`

Headers: same Bearer auth as identify.

Body:

```jsonc
{
  "distinct_id": "user-abc",          // MUST be the SAME id used at /v1/identify
  "event": "todo_completed",
  "properties": {
    "title": "Buy milk",              // the todo text
    "app": "swift",                   // this app's name (renders in the push body)
    "id": "t-123"                     // the todo id
  }
}
```

Success: `200 { "ok": true, "matched": 1, "enqueued": 1 }`.

Notification Service matches this against a notification named **"Todo completed"**
(trigger `todo_completed`, id `4d06c4e1-85b3-47b3-92b9-7e88f795171d` on the
deployed instance) whose template is:

- title: `✅ Nice work!`
- body: `You completed "{{event.title}}" in the {{event.app}} app.`

…and pushes it back to every device that distinct_id registered. The
notification targets `["fcm","apns","webpush"]`; on the deployed instance only
`fcm` credentials are configured today, so Android devices deliver now and
iOS/web deliver once you add apns/webpush credentials.

## Shared UX

Minimal todo list: add item, toggle done, delete. Two backend touchpoints:
1. **"Enable notifications"** button → request permission → get token → `POST /v1/identify`.
2. **Marking a todo complete** → `POST /v1/ingest` with `todo_completed` → Notification Service pushes a confirmation back.

Both show status/result in the UI.
