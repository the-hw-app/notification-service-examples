using System.Collections.ObjectModel;
using System.Text.Json;
using NotificationServiceTodoMaui.Models;
using NotificationServiceTodoMaui.Services;
using Microsoft.Maui.Storage;
using Plugin.Firebase.CloudMessaging;

namespace NotificationServiceTodoMaui;

public partial class MainPage : ContentPage
{
    private const string TodosKey = "notification_service_todos";

    private readonly NotificationServiceClient _notificationService;
    private readonly ObservableCollection<TodoItem> _todos = new();

    private bool _enabling;
    private bool _messagingHooked;

    public MainPage(NotificationServiceClient notificationService)
    {
        InitializeComponent();
        _notificationService = notificationService;

        LoadTodos();
        BindingContext = _todos;
    }

    // -----------------------------------------------------------------------
    // Persistence
    // -----------------------------------------------------------------------

    private void LoadTodos()
    {
        var raw = Preferences.Get(TodosKey, string.Empty);
        if (string.IsNullOrEmpty(raw)) return;

        try
        {
            var items = JsonSerializer.Deserialize<List<TodoItem>>(raw);
            if (items is null) return;
            foreach (var item in items)
                _todos.Add(item);
        }
        catch (JsonException)
        {
            // Corrupt store — start fresh.
        }
    }

    private void SaveTodos()
    {
        var raw = JsonSerializer.Serialize(_todos);
        Preferences.Set(TodosKey, raw);
    }

    // -----------------------------------------------------------------------
    // Todo actions
    // -----------------------------------------------------------------------

    private void OnAddClicked(object? sender, EventArgs e)
    {
        var text = NewTodoEntry.Text?.Trim();
        if (string.IsNullOrEmpty(text)) return;

        _todos.Add(new TodoItem { Title = text });
        NewTodoEntry.Text = string.Empty;
        SaveTodos();
    }

    private void OnDeleteClicked(object? sender, EventArgs e)
    {
        if (sender is BindableObject { BindingContext: TodoItem todo })
        {
            _todos.Remove(todo);
            SaveTodos();
        }
    }

    private void OnTodoCheckedChanged(object? sender, CheckedChangedEventArgs e)
    {
        if (sender is not BindableObject { BindingContext: TodoItem todo }) return;

        // The checkbox is bound OneWay, so during load/rebind e.Value already
        // equals todo.Done and we short-circuit. Only a genuine user toggle
        // produces a real transition here.
        if (todo.Done == e.Value) return;

        todo.Done = e.Value;
        SaveTodos();

        // Fire the Notification Service event only when a todo transitions to completed.
        // Toggling back to not-done sends nothing.
        if (e.Value)
            _ = ReportTodoCompletedAsync(todo);
    }

    private async Task ReportTodoCompletedAsync(TodoItem todo)
    {
        try
        {
            var ok = await _notificationService.IngestEventAsync(
                Config.DistinctId,
                "todo_completed",
                new Dictionary<string, string>
                {
                    ["title"] = todo.Title,
                    ["app"] = Config.AppName,
                    ["id"] = todo.Id,
                });

            System.Diagnostics.Debug.WriteLine($"Notification Service todo_completed ingest: {ok}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Notification Service todo_completed error: {ex}");
        }
    }

    // -----------------------------------------------------------------------
    // Notifications / Notification Service registration
    // -----------------------------------------------------------------------

    private async void OnEnableNotificationsClicked(object? sender, EventArgs e)
    {
        if (_enabling) return;
        _enabling = true;
        EnableButton.IsEnabled = false;
        SetStatus("Enabling…");

        try
        {
#if ANDROID
            // Android 13+ requires the POST_NOTIFICATIONS runtime permission.
            var status = await Permissions.RequestAsync<Permissions.PostNotifications>();
            if (status != PermissionStatus.Granted)
            {
                SetStatus("Notification permission denied");
                return;
            }
#endif

            // Requests notification permission and validates the push setup. On
            // iOS this prompts the system dialog and lets Firebase set up the
            // APNs bridge. It returns a plain Task and THROWS if permission is
            // denied / setup is invalid — caught by the catch block below.
            await CrossFirebaseCloudMessaging.Current.CheckIfValidAsync();

            HookMessagingEvents();

            // Same call on both platforms. On iOS this is still the FCM token;
            // Firebase relays the push to APNs internally.
            var token = await CrossFirebaseCloudMessaging.Current.GetTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                SetStatus("Could not obtain FCM token");
                return;
            }

            var ok = await _notificationService.RegisterDeviceAsync(Config.DistinctId, token);
            SetStatus(ok
                ? "Registered with Notification Service ✓"
                : "Registration failed (see logs)");
        }
        catch (Exception ex)
        {
            SetStatus($"Error: {ex.Message}");
        }
        finally
        {
            _enabling = false;
            EnableButton.IsEnabled = true;
        }
    }

    private void HookMessagingEvents()
    {
        if (_messagingHooked) return;
        _messagingHooked = true;

        // Re-register whenever Firebase rotates the token.
        CrossFirebaseCloudMessaging.Current.TokenChanged += async (_, args) =>
        {
            var ok = await _notificationService.RegisterDeviceAsync(Config.DistinctId, args.Token);
            System.Diagnostics.Debug.WriteLine($"Token refresh re-register: {ok}");
        };

        // Foreground message listener (demo: show an alert).
        CrossFirebaseCloudMessaging.Current.NotificationReceived += (_, args) =>
        {
            var title = args.Notification.Title ?? "Message";
            var body = args.Notification.Body ?? string.Empty;
            MainThread.BeginInvokeOnMainThread(() =>
                DisplayAlert(title, body, "OK"));
        };
    }

    private void SetStatus(string text) =>
        MainThread.BeginInvokeOnMainThread(() => StatusLabel.Text = text);
}
