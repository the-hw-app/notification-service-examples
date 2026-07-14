using Microsoft.Maui.Storage;

namespace NotificationServiceTodoMaui.Services;

/// <summary>
/// Notification Service backend configuration.
///
/// SECURITY: <see cref="NotificationServiceApiKey"/> is a single instance-wide
/// bearer token. Do NOT ship it inside a distributed client in production —
/// anyone can extract it from the app binary. For production, front the
/// Notification Service with a thin proxy that holds the key server-side, or add
/// a per-device mint endpoint. This placeholder exists only so the demo runs
/// end-to-end.
/// </summary>
public static class Config
{
    /// <summary>Base URL of the deployed Notification Service instance (no trailing slash).</summary>
    public const string NotificationServiceBaseUrl = "https://notification-service.YOUR-SUBDOMAIN.workers.dev";

    /// <summary>Replace with your Notification Service instance API key.</summary>
    public const string NotificationServiceApiKey = "YOUR_NOTIFICATION_SERVICE_API_KEY";

    /// <summary>This app's name, sent in properties and rendered in the push body.</summary>
    public const string AppName = "dotnet-maui";

    private const string DistinctIdKey = "notification_service_distinct_id";

    /// <summary>
    /// A stable distinct id for this install, persisted in <see cref="Preferences"/>.
    /// Created once (a GUID) and reused for every /v1/identify and /v1/ingest call so
    /// the Notification Service can push matched notifications back to this device.
    /// </summary>
    public static string DistinctId
    {
        get
        {
            var id = Preferences.Get(DistinctIdKey, string.Empty);
            if (string.IsNullOrEmpty(id))
            {
                id = Guid.NewGuid().ToString();
                Preferences.Set(DistinctIdKey, id);
            }

            return id;
        }
    }
}
