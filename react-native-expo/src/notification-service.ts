import { NOTIFICATION_SERVICE_API_KEY, NOTIFICATION_SERVICE_BASE_URL } from './config';

/**
 * Push channel understood by the Notification Service backend. React Native maps:
 *   Platform.OS === 'ios'     -> 'apns'
 *   Platform.OS === 'android' -> 'fcm'
 */
export type NotificationServiceChannel = 'apns' | 'fcm';

/**
 * Register a device's NATIVE push token with Notification Service.
 *
 * POSTs to `<base>/v1/identify` with Bearer auth. The token must be the native
 * device token (APNs hex string on iOS, FCM token on Android) obtained via
 * `Notifications.getDevicePushTokenAsync()` — NOT the Expo push token.
 *
 * @param distinctId Stable per-user/device id you choose.
 * @param token      Native push token string.
 * @param channel    'apns' (iOS) or 'fcm' (Android).
 */
export async function registerDevice(
  distinctId: string,
  token: string,
  channel: NotificationServiceChannel
): Promise<void> {
  const res = await fetch(`${NOTIFICATION_SERVICE_BASE_URL}/v1/identify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTIFICATION_SERVICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      distinct_id: distinctId,
      properties: { app: 'react-native-expo' },
      device: {
        channel,
        token,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Notification Service identify failed: ${res.status} ${res.statusText}${
        detail ? ` — ${detail}` : ''
      }`
    );
  }
}

/**
 * Send an event to Notification Service.
 *
 * POSTs to `<base>/v1/ingest` with Bearer auth. Notification Service matches the event
 * against configured notifications and pushes them back to every device the
 * `distinctId` registered via `registerDevice`.
 *
 * @param distinctId Stable per-user/device id — MUST match the one used at
 *                   `/v1/identify` so the push reaches the right devices.
 * @param event      Event name (e.g. 'todo_completed').
 * @param properties String-valued event properties (e.g. title, app, id).
 */
export async function ingestEvent(
  distinctId: string,
  event: string,
  properties: Record<string, string>
): Promise<void> {
  const res = await fetch(`${NOTIFICATION_SERVICE_BASE_URL}/v1/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTIFICATION_SERVICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      distinct_id: distinctId,
      event,
      properties,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Notification Service ingest failed: ${res.status} ${res.statusText}${
        detail ? ` — ${detail}` : ''
      }`
    );
  }
}
