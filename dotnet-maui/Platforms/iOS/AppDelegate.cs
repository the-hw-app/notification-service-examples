using Foundation;
using Plugin.Firebase.CloudMessaging;
using UIKit;

namespace NotificationServiceTodoMaui;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

    public override bool FinishedLaunching(UIApplication application, NSDictionary launchOptions)
    {
        // CrossFirebase is initialized in MauiProgram's WillFinishLaunching
        // lifecycle hook; here we wire up Cloud Messaging so the FCM<->APNs
        // bridge and token/notification callbacks are active.
        //
        // Firebase's default method swizzling (FirebaseAppDelegateProxyEnabled,
        // on by default) forwards the APNs device token to FCM automatically,
        // so no manual RegisteredForRemoteNotifications handling is required here.
        FirebaseCloudMessagingImplementation.Initialize();
        return base.FinishedLaunching(application, launchOptions);
    }
}
