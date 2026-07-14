// ---------------------------------------------------------------------------
// Notification Service instance configuration
// ---------------------------------------------------------------------------
//
// SECURITY: `NOTIFICATION_SERVICE_API_KEY` is a single instance-wide bearer token. Do NOT
// ship it inside a distributed client in production — anyone can extract it
// from the app bundle. See README.md for the recommended proxy approach. The
// placeholder below is only for local demos.

export const NOTIFICATION_SERVICE_BASE_URL = 'https://notification-service.YOUR-SUBDOMAIN.workers.dev';
export const NOTIFICATION_SERVICE_API_KEY = 'YOUR_NOTIFICATION_SERVICE_API_KEY';

// VAPID public key used for Web Push (browser/PWA path only). Mint one from
// Notification Service with: POST /v1/channels/webpush/keys  (see README).
export const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY';

const DISTINCT_ID_STORAGE_KEY = 'notification-service.distinct_id';

/**
 * Returns a stable per-device distinct id, generating and persisting a UUID in
 * localStorage on first use. Safe to call only in the browser.
 */
export function getDistinctId(): string {
  if (typeof window === 'undefined') {
    // No stable storage during SSR/static build — callers use this at runtime.
    return 'server';
  }

  let id = window.localStorage.getItem(DISTINCT_ID_STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(DISTINCT_ID_STORAGE_KEY, id);
  }
  return id;
}

/**
 * Converts a base64url-encoded VAPID public key into the Uint8Array that
 * `PushManager.subscribe({ applicationServerKey })` expects.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  // Back the array with a concrete ArrayBuffer (not ArrayBufferLike) so it
  // satisfies the `BufferSource` type PushManager.subscribe expects.
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
