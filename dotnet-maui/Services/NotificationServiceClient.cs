using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NotificationServiceTodoMaui.Services;

/// <summary>
/// Thin client for the two Notification Service HTTP endpoints this app touches:
/// <c>POST /v1/identify</c> (register a device push token) and
/// <c>POST /v1/ingest</c> (fire a user-action event).
///
/// Both use Bearer auth with the shared instance API key. On both Android and
/// iOS the push token comes from Plugin.Firebase and is sent on channel
/// <c>"fcm"</c> — on iOS, Firebase relays the message to APNs internally, so we
/// still use the FCM token and the <c>fcm</c> channel (not a raw APNs token).
/// </summary>
public sealed class NotificationServiceClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _http;

    public NotificationServiceClient(HttpClient http)
    {
        _http = http;
        _http.BaseAddress ??= new Uri(Config.NotificationServiceBaseUrl);
        _http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", Config.NotificationServiceApiKey);
    }

    /// <summary>
    /// Registers a device FCM token with the Notification Service.
    ///
    /// <c>POST &lt;base&gt;/v1/identify</c> with body:
    /// <code>
    /// {
    ///   "distinct_id": "&lt;distinctId&gt;",
    ///   "properties": { "app": "dotnet-maui" },
    ///   "device": { "channel": "fcm", "token": "&lt;fcmToken&gt;" }
    /// }
    /// </code>
    /// </summary>
    /// <returns><c>true</c> on a <c>200 { "ok": true }</c> response.</returns>
    public async Task<bool> RegisterDeviceAsync(
        string distinctId,
        string fcmToken,
        CancellationToken cancellationToken = default)
    {
        var payload = new IdentifyRequestBody
        {
            DistinctId = distinctId,
            Properties = new Dictionary<string, object> { ["app"] = Config.AppName },
            Device = new DeviceBody { Channel = "fcm", Token = fcmToken },
        };

        return await PostAsync("/v1/identify", payload, cancellationToken);
    }

    /// <summary>
    /// Sends a user-action event to the Notification Service.
    ///
    /// <c>POST &lt;base&gt;/v1/ingest</c> with body:
    /// <code>
    /// {
    ///   "distinct_id": "&lt;distinctId&gt;",
    ///   "event": "todo_completed",
    ///   "properties": { "title": "Buy milk", "app": "dotnet-maui", "id": "t-123" }
    /// }
    /// </code>
    ///
    /// <paramref name="distinctId"/> MUST be the same id used at /v1/identify so
    /// the Notification Service can push the matched notification back to this
    /// user's devices.
    /// </summary>
    /// <returns><c>true</c> on a <c>200 { "ok": true }</c> response.</returns>
    public async Task<bool> IngestEventAsync(
        string distinctId,
        string @event,
        IReadOnlyDictionary<string, string> properties,
        CancellationToken cancellationToken = default)
    {
        var payload = new IngestRequestBody
        {
            DistinctId = distinctId,
            Event = @event,
            Properties = properties,
        };

        return await PostAsync("/v1/ingest", payload, cancellationToken);
    }

    private async Task<bool> PostAsync<T>(
        string path,
        T payload,
        CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            using var response = await _http.PostAsync(path, content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                // Surface non-2xx so the caller can show a failure in the UI.
                System.Diagnostics.Debug.WriteLine(
                    $"Notification Service {path} failed: {(int)response.StatusCode} {responseBody}");
                return false;
            }

            using var doc = JsonDocument.Parse(responseBody);
            return doc.RootElement.TryGetProperty("ok", out var ok)
                   && ok.ValueKind == JsonValueKind.True;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Notification Service {path} error: {ex}");
            return false;
        }
    }

    // ---- Request DTOs ------------------------------------------------------

    private sealed class IdentifyRequestBody
    {
        [JsonPropertyName("distinct_id")]
        public required string DistinctId { get; init; }

        [JsonPropertyName("properties")]
        public required IReadOnlyDictionary<string, object> Properties { get; init; }

        [JsonPropertyName("device")]
        public required DeviceBody Device { get; init; }
    }

    private sealed class DeviceBody
    {
        [JsonPropertyName("channel")]
        public required string Channel { get; init; }

        [JsonPropertyName("token")]
        public required string Token { get; init; }
    }

    private sealed class IngestRequestBody
    {
        [JsonPropertyName("distinct_id")]
        public required string DistinctId { get; init; }

        [JsonPropertyName("event")]
        public required string Event { get; init; }

        [JsonPropertyName("properties")]
        public required IReadOnlyDictionary<string, string> Properties { get; init; }
    }
}
