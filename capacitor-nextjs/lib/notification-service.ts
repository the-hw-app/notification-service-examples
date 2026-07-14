// ---------------------------------------------------------------------------
// Notification Service client — registers a device's push token with `POST /v1/identify`.
// ---------------------------------------------------------------------------

import { NOTIFICATION_SERVICE_API_KEY, NOTIFICATION_SERVICE_BASE_URL } from './config';

export type NativeChannel = 'apns' | 'fcm';

export interface WebPushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

async function identify(body: unknown): Promise<void> {
  const res = await fetch(`${NOTIFICATION_SERVICE_BASE_URL}/v1/identify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTIFICATION_SERVICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Notification Service /v1/identify failed: ${res.status} ${text}`.trim());
  }
}

/**
 * Fire a product event to Notification Service via `POST /v1/ingest`. Notification Service matches the
 * event against configured notifications and pushes them back to every device
 * this `distinctId` registered. `distinctId` MUST be the same id used at
 * `/v1/identify`.
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
    body: JSON.stringify({ distinct_id: distinctId, event, properties }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Notification Service /v1/ingest failed: ${res.status} ${text}`.trim());
  }
}

/**
 * Register a native (iOS/Android) push token.
 * `channel` is `apns` on iOS and `fcm` on Android.
 */
export async function registerNative(
  distinctId: string,
  token: string,
  channel: NativeChannel
): Promise<void> {
  await identify({
    distinct_id: distinctId,
    properties: { app: 'capacitor-nextjs' },
    device: {
      channel,
      token,
    },
  });
}

/**
 * Register a Web Push subscription (browser/PWA path).
 * Note: NO `token` field — webpush devices carry a `subscription` instead.
 */
export async function registerWebPush(
  distinctId: string,
  subscription: WebPushSubscriptionJSON
): Promise<void> {
  await identify({
    distinct_id: distinctId,
    properties: { app: 'capacitor-nextjs' },
    device: {
      channel: 'webpush',
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
    },
  });
}
