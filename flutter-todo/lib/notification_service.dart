import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';

/// Registers a device push token with Notification Service.
///
/// POSTs to `<base>/v1/identify` with the shared contract body:
/// ```json
/// {
///   "distinct_id": "<distinctId>",
///   "properties": { "app": "flutter" },
///   "device": { "channel": "fcm", "token": "<token>" }
/// }
/// ```
///
/// On iOS the FCM token returned by `FirebaseMessaging.instance.getToken()` is
/// still sent on channel `"fcm"`; Firebase relays the message to APNs internally.
///
/// Returns `true` on a `200 { "ok": true }` response, `false` otherwise.
Future<bool> registerDevice({
  required String distinctId,
  required String token,
}) async {
  final uri = Uri.parse('$notificationServiceBaseUrl/v1/identify');

  final body = jsonEncode({
    'distinct_id': distinctId,
    'properties': {'app': 'flutter'},
    'device': {
      'channel': 'fcm',
      'token': token,
    },
  });

  try {
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $notificationServiceApiKey',
        'Content-Type': 'application/json',
      },
      body: body,
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return decoded is Map && decoded['ok'] == true;
    }

    // ignore: avoid_print
    print('Notification Service identify failed: ${response.statusCode} ${response.body}');
    return false;
  } catch (e) {
    // ignore: avoid_print
    print('Notification Service identify error: $e');
    return false;
  }
}

/// Sends a user-action event to Notification Service.
///
/// POSTs to `<base>/v1/ingest` with the shared contract body:
/// ```json
/// {
///   "distinct_id": "<distinctId>",
///   "event": "todo_completed",
///   "properties": { "title": "Buy milk", "app": "flutter", "id": "t-123" }
/// }
/// ```
///
/// `distinctId` MUST be the same id used at `/v1/identify` so Notification Service can push
/// the matched notification back to that user's registered devices.
///
/// Returns `true` on a `200 { "ok": true }` response, `false` otherwise.
Future<bool> ingestEvent({
  required String distinctId,
  required String event,
  required Map<String, String> properties,
}) async {
  final uri = Uri.parse('$notificationServiceBaseUrl/v1/ingest');

  final body = jsonEncode({
    'distinct_id': distinctId,
    'event': event,
    'properties': properties,
  });

  try {
    final response = await http.post(
      uri,
      headers: {
        'Authorization': 'Bearer $notificationServiceApiKey',
        'Content-Type': 'application/json',
      },
      body: body,
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return decoded is Map && decoded['ok'] == true;
    }

    // ignore: avoid_print
    print('Notification Service ingest failed: ${response.statusCode} ${response.body}');
    return false;
  } catch (e) {
    // ignore: avoid_print
    print('Notification Service ingest error: $e');
    return false;
  }
}
