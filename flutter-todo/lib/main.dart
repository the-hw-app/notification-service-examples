import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import 'notification_service.dart';

const _kTodosKey = 'todos';
const _kDistinctIdKey = 'distinct_id';

void main() {
  runApp(const TodoApp());
}

/// A single todo item.
class Todo {
  Todo({required this.id, required this.title, this.done = false});

  final String id;
  String title;
  bool done;

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'done': done};

  factory Todo.fromJson(Map<String, dynamic> json) => Todo(
        id: json['id'] as String,
        title: json['title'] as String,
        done: json['done'] as bool? ?? false,
      );
}

class TodoApp extends StatelessWidget {
  const TodoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Notification Service Todo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const TodoHomePage(),
    );
  }
}

class TodoHomePage extends StatefulWidget {
  const TodoHomePage({super.key});

  @override
  State<TodoHomePage> createState() => _TodoHomePageState();
}

class _TodoHomePageState extends State<TodoHomePage> {
  final List<Todo> _todos = [];
  final TextEditingController _controller = TextEditingController();
  final _uuid = const Uuid();

  String _status = 'Notifications not enabled';
  bool _enabling = false;

  @override
  void initState() {
    super.initState();
    _loadTodos();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  Future<void> _loadTodos() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kTodosKey);
    if (raw != null) {
      final list = (jsonDecode(raw) as List)
          .map((e) => Todo.fromJson(e as Map<String, dynamic>))
          .toList();
      setState(() {
        _todos
          ..clear()
          ..addAll(list);
      });
    }
  }

  Future<void> _saveTodos() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(_todos.map((t) => t.toJson()).toList());
    await prefs.setString(_kTodosKey, raw);
  }

  /// Returns a stable distinct id for this install, creating one if needed.
  Future<String> _distinctId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_kDistinctIdKey);
    if (id == null) {
      id = _uuid.v4();
      await prefs.setString(_kDistinctIdKey, id);
    }
    return id;
  }

  // ---------------------------------------------------------------------------
  // Todo actions
  // ---------------------------------------------------------------------------

  void _addTodo() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _todos.add(Todo(id: _uuid.v4(), title: text));
      _controller.clear();
    });
    _saveTodos();
  }

  void _toggleTodo(Todo todo) {
    setState(() => todo.done = !todo.done);
    _saveTodos();
    // Fire a Notification Service event only when a todo transitions to completed.
    if (todo.done) {
      _reportTodoCompleted(todo);
    }
  }

  /// Sends a `todo_completed` event to Notification Service without blocking the UI.
  Future<void> _reportTodoCompleted(Todo todo) async {
    try {
      final id = await _distinctId();
      final ok = await ingestEvent(
        distinctId: id,
        event: 'todo_completed',
        properties: {
          'title': todo.title,
          'app': 'flutter',
          'id': todo.id,
        },
      );
      debugPrint('Notification Service todo_completed ingest: $ok');
    } catch (e) {
      debugPrint('Notification Service todo_completed error: $e');
    }
  }

  void _deleteTodo(Todo todo) {
    setState(() => _todos.removeWhere((t) => t.id == todo.id));
    _saveTodos();
  }

  // ---------------------------------------------------------------------------
  // Notifications / Notification Service registration
  // ---------------------------------------------------------------------------

  Future<void> _enableNotifications() async {
    setState(() {
      _enabling = true;
      _status = 'Enabling…';
    });

    try {
      await Firebase.initializeApp();

      final messaging = FirebaseMessaging.instance;

      // On iOS this prompts the system permission dialog and lets Firebase set
      // up the APNs bridge; on Android 13+ it prompts POST_NOTIFICATIONS.
      final settings = await messaging.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        setState(() => _status = 'Permission denied');
        return;
      }

      // Foreground message listener (demo: show a snackbar).
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        final title = message.notification?.title ?? 'Message';
        final body = message.notification?.body ?? message.data.toString();
        debugPrint('Foreground FCM message: $title / $body');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$title: $body')),
          );
        }
      });

      // Re-register whenever Firebase rotates the token.
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
        final id = await _distinctId();
        final ok = await registerDevice(distinctId: id, token: newToken);
        debugPrint('Token refresh re-register: $ok');
      });

      final token = await messaging.getToken();
      if (token == null) {
        setState(() => _status = 'Could not obtain FCM token');
        return;
      }

      final id = await _distinctId();
      final ok = await registerDevice(distinctId: id, token: token);

      setState(() {
        _status = ok
            ? 'Registered with Notification Service ✓'
            : 'Registration failed (see logs)';
      });
    } catch (e) {
      setState(() => _status = 'Error: $e');
    } finally {
      if (mounted) setState(() => _enabling = false);
    }
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notification Service Todo')),
      body: Column(
        children: [
          _buildNotificationBar(),
          _buildAddRow(),
          const Divider(height: 1),
          Expanded(child: _buildList()),
        ],
      ),
    );
  }

  Widget _buildNotificationBar() {
    return Container(
      width: double.infinity,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_status, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: _enabling ? null : _enableNotifications,
            icon: _enabling
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.notifications_active),
            label: const Text('Enable Notifications'),
          ),
        ],
      ),
    );
  }

  Widget _buildAddRow() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              decoration: const InputDecoration(
                hintText: 'Add a todo…',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onSubmitted: (_) => _addTodo(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed: _addTodo,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_todos.isEmpty) {
      return const Center(child: Text('No todos yet'));
    }
    return ListView.builder(
      itemCount: _todos.length,
      itemBuilder: (context, index) {
        final todo = _todos[index];
        return ListTile(
          leading: Checkbox(
            value: todo.done,
            onChanged: (_) => _toggleTodo(todo),
          ),
          title: Text(
            todo.title,
            style: TextStyle(
              decoration:
                  todo.done ? TextDecoration.lineThrough : TextDecoration.none,
            ),
          ),
          trailing: IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => _deleteTodo(todo),
          ),
        );
      },
    );
  }
}
