import Foundation
import Combine

/// A single todo item.
struct TodoItem: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var isDone: Bool

    init(id: UUID = UUID(), title: String, isDone: Bool = false) {
        self.id = id
        self.title = title
        self.isDone = isDone
    }
}

/// Holds the todo list and persists it to UserDefaults.
@MainActor
final class TodoStore: ObservableObject {

    @Published var items: [TodoItem] = [] {
        didSet { save() }
    }

    private let storageKey = "notificationService.todos"

    init() {
        load()
    }

    // MARK: - Mutations

    func add(_ title: String) {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        items.append(TodoItem(title: trimmed))
    }

    func toggle(_ item: TodoItem) {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        items[index].isDone.toggle()

        // Fire a `todo_completed` event only on the not-done -> done transition.
        // Toggling back to not-done sends nothing.
        if items[index].isDone {
            reportCompleted(items[index])
        }
    }

    /// Fire-and-forget: report a completed todo to Notification Service using the SAME
    /// persisted `distinct_id` that identify uses. Errors are logged, not surfaced.
    private func reportCompleted(_ item: TodoItem) {
        Task {
            do {
                try await NotificationServiceClient.ingest(
                    distinctId: Config.distinctId,
                    event: "todo_completed",
                    properties: [
                        "title": item.title,
                        "app": "swift",
                        "id": item.id.uuidString
                    ]
                )
            } catch {
                print("Notification Service ingest failed: \(error.localizedDescription)")
            }
        }
    }

    func delete(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
    }

    // MARK: - Persistence

    private func load() {
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let decoded = try? JSONDecoder().decode([TodoItem].self, from: data)
        else { return }
        items = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(items) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}
