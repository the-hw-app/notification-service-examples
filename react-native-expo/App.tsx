import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { ingestEvent, registerDevice, type NotificationServiceChannel } from './src/notification-service';
import { getOrCreateDistinctId } from './src/id';

// Show notifications while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` is the legacy field (still required by the type);
    // `shouldShowBanner`/`shouldShowList` are its SDK 52+ replacements.
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

const TODOS_KEY = 'notificationService.todos';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);

  const [status, setStatus] = useState('Notifications not enabled yet.');
  const [busy, setBusy] = useState(false);

  // Load persisted todos on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TODOS_KEY);
        if (raw) setTodos(JSON.parse(raw) as Todo[]);
      } catch {
        // ignore malformed storage
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist todos whenever they change (after the initial load).
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(TODOS_KEY, JSON.stringify(todos)).catch(() => {});
  }, [todos, loaded]);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, done: false },
      ...prev,
    ]);
    setInput('');
  }

  function toggleTodo(id: string) {
    const todo = todos.find((t) => t.id === id);

    // Fire a Notification Service event only when a todo transitions to completed
    // (done: false -> true). Toggling back to not-done sends nothing.
    // Fire-and-forget; the SAME distinct_id used by identify is reused.
    if (todo && !todo.done) {
      getOrCreateDistinctId()
        .then((distinctId) =>
          ingestEvent(distinctId, 'todo_completed', {
            title: todo.text,
            app: 'react-native-expo',
            id: todo.id,
          })
        )
        .catch(console.warn);
    }

    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  async function enableNotifications() {
    setBusy(true);
    try {
      if (!Device.isDevice) {
        setStatus('Must use a physical device for push notifications.');
        return;
      }

      // Android needs a notification channel for the permission prompt / delivery.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      // Request permission (no-op re-grant if already granted).
      const existing = await Notifications.getPermissionsAsync();
      let finalStatus = existing.status;
      if (finalStatus !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        finalStatus = req.status;
      }
      if (finalStatus !== 'granted') {
        setStatus('Permission denied. Enable notifications in Settings.');
        return;
      }

      // Get the NATIVE device push token (APNs hex on iOS, FCM string on Android).
      // NOT getExpoPushTokenAsync — that returns an ExponentPushToken[...].
      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      const token = devicePushToken.data as string;
      const channel: NotificationServiceChannel = Platform.OS === 'ios' ? 'apns' : 'fcm';

      const distinctId = await getOrCreateDistinctId();

      setStatus(`Registering (${channel})…`);
      await registerDevice(distinctId, token, channel);
      setStatus(`Registered with Notification Service as ${distinctId} (${channel}).`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Notification Service Todo</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a todo…"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTodo}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={addTodo}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        style={styles.list}
        data={todos}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No todos yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable style={styles.rowMain} onPress={() => toggleTodo(item.id)}>
              <Text style={styles.checkbox}>{item.done ? '☑' : '☐'}</Text>
              <Text style={[styles.rowText, item.done && styles.rowTextDone]}>
                {item.text}
              </Text>
            </Pressable>
            <Pressable onPress={() => deleteTodo(item.id)} hitSlop={8}>
              <Text style={styles.delete}>✕</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Pressable
          style={[styles.notifyButton, busy && styles.notifyButtonDisabled]}
          onPress={enableNotifications}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.notifyButtonText}>Enable Notifications</Text>
          )}
        </Pressable>
        <Text style={styles.status}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    fontSize: 20,
  },
  rowText: {
    fontSize: 16,
    flexShrink: 1,
  },
  rowTextDone: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  delete: {
    fontSize: 18,
    color: '#c0392b',
    paddingHorizontal: 6,
  },
  footer: {
    paddingVertical: 16,
    gap: 10,
  },
  notifyButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  notifyButtonDisabled: {
    opacity: 0.6,
  },
  notifyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  status: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
  },
});
