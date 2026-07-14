using NotificationServiceTodoMaui.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.LifecycleEvents;
using Plugin.Firebase.Bundled.Shared;

#if IOS
using Plugin.Firebase.Bundled.Platforms.iOS;
#elif ANDROID
using Plugin.Firebase.Bundled.Platforms.Android;
#endif

namespace NotificationServiceTodoMaui;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .RegisterFirebaseServices();

        // Notification Service HTTP client (typed) — single instance for the app.
        builder.Services.AddSingleton<NotificationServiceClient>();
        builder.Services.AddSingleton(_ => new HttpClient());

        // App shell + pages (constructor-injected).
        builder.Services.AddSingleton<AppShell>();
        builder.Services.AddSingleton<MainPage>();

        return builder.Build();
    }

    /// <summary>
    /// Initializes Plugin.Firebase per platform via lifecycle events. Firebase
    /// reads native config (google-services.json on Android, GoogleService-Info.plist
    /// on iOS) supplied by the developer.
    /// </summary>
    private static MauiAppBuilder RegisterFirebaseServices(this MauiAppBuilder builder)
    {
        builder.ConfigureLifecycleEvents(events =>
        {
#if IOS
            events.AddiOS(iOS => iOS.WillFinishLaunching((_, __) =>
            {
                CrossFirebase.Initialize(CreateCrossFirebaseSettings());
                return false;
            }));
#elif ANDROID
            events.AddAndroid(android => android.OnCreate((activity, _) =>
                CrossFirebase.Initialize(activity, () => Platform.CurrentActivity, CreateCrossFirebaseSettings())));
#endif
        });

        return builder;
    }

    private static CrossFirebaseSettings CreateCrossFirebaseSettings() =>
        new(isCloudMessagingEnabled: true);
}
