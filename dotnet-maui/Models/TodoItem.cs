using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Text.Json.Serialization;

namespace NotificationServiceTodoMaui.Models;

/// <summary>A single todo item. Serialized to JSON in Preferences.</summary>
public sealed class TodoItem : INotifyPropertyChanged
{
    private bool _done;

    [JsonPropertyName("id")]
    public string Id { get; init; } = Guid.NewGuid().ToString();

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("done")]
    public bool Done
    {
        get => _done;
        set
        {
            if (_done == value) return;
            _done = value;
            OnPropertyChanged();
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    private void OnPropertyChanged([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
