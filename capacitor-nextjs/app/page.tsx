'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ingestEvent, registerNative, registerWebPush } from '@/lib/notification-service';
import {
  getDistinctId,
  urlBase64ToUint8Array,
  VAPID_PUBLIC_KEY,
} from '@/lib/config';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

const TODOS_STORAGE_KEY = 'notification-service.todos';

type StatusKind = 'idle' | 'working' | 'ok' | 'error';

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<StatusKind>('idle');

  // ---- persistence -------------------------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TODOS_STORAGE_KEY);
      if (raw) setTodos(JSON.parse(raw) as Todo[]);
    } catch {
      /* ignore malformed storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
  }, [todos, loaded]);

  // ---- todo actions ------------------------------------------------------
  function addTodo() {
    const text = draft.trim();
    if (!text) return;
    setTodos((prev) => [
      { id: crypto.randomUUID(), text, done: false },
      ...prev,
    ]);
    setDraft('');
  }

  function toggleTodo(id: string) {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const done = !t.done;
        // Fire an event to Notification Service only when a todo becomes completed.
        if (done) {
          ingestEvent(getDistinctId(), 'todo_completed', {
            title: t.text,
            app: 'capacitor-nextjs',
            id: t.id,
          }).catch(console.warn);
        }
        return { ...t, done };
      })
    );
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  // ---- notifications -----------------------------------------------------
  function setStatusMsg(kind: StatusKind, msg: string) {
    setStatusKind(kind);
    setStatus(msg);
  }

  async function enableNotifications() {
    const distinctId = getDistinctId();
    setStatusMsg('working', 'Requesting notification permission…');

    try {
      if (Capacitor.isNativePlatform()) {
        await enableNative(distinctId);
      } else {
        await enableWebPush(distinctId);
      }
    } catch (err) {
      setStatusMsg(
        'error',
        `Failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Native path: @capacitor/push-notifications registration event.
  async function enableNative(distinctId: string) {
    // Dynamic import keeps this native-only plugin out of the web bundle path.
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      setStatusMsg('error', 'Notification permission denied.');
      return;
    }

    // `apns` on iOS, `fcm` on Android.
    const platform = Capacitor.getPlatform();
    const channel = platform === 'ios' ? 'apns' : 'fcm';

    // The token arrives asynchronously via the `registration` event.
    await PushNotifications.addListener('registration', async (tokenData) => {
      try {
        await registerNative(distinctId, tokenData.value, channel);
        setStatusMsg(
          'ok',
          `Registered with Notification Service (${channel}). Token: ${tokenData.value.slice(
            0,
            12
          )}…`
        );
      } catch (err) {
        setStatusMsg(
          'error',
          `Notification Service error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      setStatusMsg('error', `Registration error: ${JSON.stringify(err)}`);
    });

    setStatusMsg('working', 'Registering for push…');
    await PushNotifications.register();
  }

  // Web/PWA path: service worker + PushManager subscription.
  async function enableWebPush(distinctId: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatusMsg('error', 'Web Push is not supported in this browser.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatusMsg('error', 'Notification permission denied.');
      return;
    }

    setStatusMsg('working', 'Registering service worker…');
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    setStatusMsg('working', 'Subscribing to push…');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Normalize to the { endpoint, keys: { p256dh, auth } } shape.
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      setStatusMsg('error', 'Subscription missing endpoint/keys.');
      return;
    }

    await registerWebPush(distinctId, {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });

    setStatusMsg('ok', 'Registered with Notification Service (webpush).');
  }

  // ---- render ------------------------------------------------------------
  return (
    <main>
      <h1>Notification Service Todo</h1>
      <p className="subtitle">
        Capacitor + Next.js demo that registers a push token with Notification Service.
      </p>

      <div className="card">
        <div className="add-row">
          <input
            type="text"
            placeholder="Add a task…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTodo();
            }}
          />
          <button onClick={addTodo}>Add</button>
        </div>

        {todos.length === 0 ? (
          <p className="empty">No tasks yet — add one above.</p>
        ) : (
          <ul className="todos">
            {todos.map((todo) => (
              <li key={todo.id}>
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                  aria-label={`Toggle ${todo.text}`}
                />
                <span className={`todo-text${todo.done ? ' done' : ''}`}>
                  {todo.text}
                </span>
                <button
                  className="delete-btn"
                  onClick={() => deleteTodo(todo.id)}
                  aria-label={`Delete ${todo.text}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <p className="section-title">Push notifications</p>
        <button
          className="notify-btn"
          onClick={enableNotifications}
          disabled={statusKind === 'working'}
        >
          {statusKind === 'working' ? 'Working…' : 'Enable Notifications'}
        </button>
        {status && (
          <p
            className={`status${
              statusKind === 'ok'
                ? ' ok'
                : statusKind === 'error'
                ? ' error'
                : ''
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </main>
  );
}
