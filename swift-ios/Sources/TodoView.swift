import SwiftUI
import UserNotifications
import UIKit

struct TodoView: View {
    @StateObject private var store = TodoStore()
    // Externally-owned singleton (shared with the AppDelegate), so observe rather than own.
    @ObservedObject private var push = PushRegistrationModel.shared
    @State private var newTitle = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                notificationBanner

                List {
                    Section {
                        addRow
                    }

                    Section("Todos") {
                        if store.items.isEmpty {
                            Text("No todos yet. Add one above.")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(store.items) { item in
                                todoRow(item)
                            }
                            .onDelete(perform: store.delete)
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
            .navigationTitle("Notification Service Todo")
        }
    }

    // MARK: - Subviews

    private var addRow: some View {
        HStack {
            TextField("New todo", text: $newTitle)
                .onSubmit(addTodo)
            Button(action: addTodo) {
                Image(systemName: "plus.circle.fill")
            }
            .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    private func todoRow(_ item: TodoItem) -> some View {
        Button {
            store.toggle(item)
        } label: {
            HStack {
                Image(systemName: item.isDone ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(item.isDone ? .green : .secondary)
                Text(item.title)
                    .strikethrough(item.isDone)
                    .foregroundStyle(item.isDone ? .secondary : .primary)
                Spacer()
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var notificationBanner: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "bell.badge.fill")
                Text(push.status.message)
                    .font(.subheadline)
                Spacer()
            }
            Button {
                enableNotifications()
            } label: {
                Text("Enable Notifications")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(push.status == .registered)
        }
        .padding()
        .background(.thinMaterial)
    }

    // MARK: - Actions

    private func addTodo() {
        store.add(newTitle)
        newTitle = ""
    }

    /// Requests notification permission, then registers for remote notifications.
    /// The APNs token arrives asynchronously in the AppDelegate, which drives the
    /// PushRegistrationModel status shown in the banner.
    private func enableNotifications() {
        push.set(.requestingPermission)
        Task {
            do {
                let granted = try await UNUserNotificationCenter.current()
                    .requestAuthorization(options: [.alert, .badge, .sound])
                guard granted else {
                    push.set(.denied)
                    return
                }
                push.set(.waitingForToken)
                UIApplication.shared.registerForRemoteNotifications()
            } catch {
                push.set(.failed(error.localizedDescription))
            }
        }
    }
}

#Preview {
    TodoView()
}
