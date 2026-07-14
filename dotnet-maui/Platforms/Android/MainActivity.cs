using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.OS;
using Plugin.Firebase.CloudMessaging;

namespace NotificationServiceTodoMaui;

[Activity(
    Theme = "@style/Maui.SplashTheme",
    MainLauncher = true,
    LaunchMode = LaunchMode.SingleTop,
    ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation |
                           ConfigChanges.UiMode | ConfigChanges.ScreenLayout |
                           ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
public class MainActivity : MauiAppCompatActivity
{
    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);
        CreateNotificationChannel();
        // Forward the launch intent so Plugin.Firebase can surface a tapped
        // notification's data.
        FirebaseCloudMessagingImplementation.OnNewIntent(Intent);
    }

    protected override void OnNewIntent(Intent? intent)
    {
        base.OnNewIntent(intent);
        FirebaseCloudMessagingImplementation.OnNewIntent(intent);
    }

    private void CreateNotificationChannel()
    {
        // Notification channels are required on Android 8.0 (API 26)+.
        if (Build.VERSION.SdkInt < BuildVersionCodes.O)
            return;

        var channelId = $"{PackageName}.general";
        if (GetSystemService(NotificationService) is NotificationManager manager)
        {
            var channel = new NotificationChannel(
                channelId, "General", NotificationImportance.Default);
            manager.CreateNotificationChannel(channel);
            FirebaseCloudMessagingImplementation.ChannelId = channelId;
        }
    }
}
