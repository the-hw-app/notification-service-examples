namespace NotificationServiceTodoMaui;

public partial class AppShell : Shell
{
    public AppShell(MainPage page)
    {
        InitializeComponent();

        // MainPage is resolved from the DI container (it needs NotificationServiceClient),
        // so we assign it as the root ShellContent's page here rather than in XAML.
        RootContent.Content = page;
    }
}
