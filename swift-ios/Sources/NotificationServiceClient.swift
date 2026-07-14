import Foundation

/// Thin client for the Notification Service `POST /v1/identify` endpoint.
enum NotificationServiceClient {

    enum RegisterError: LocalizedError {
        case badURL
        case http(status: Int, body: String)
        case transport(Error)

        var errorDescription: String? {
            switch self {
            case .badURL:
                return "Invalid Notification Service base URL."
            case let .http(status, body):
                return "Server returned HTTP \(status): \(body)"
            case let .transport(error):
                return error.localizedDescription
            }
        }
    }

    // MARK: - Request payload

    private struct IdentifyBody: Encodable {
        let distinct_id: String
        let properties: [String: String]
        let device: Device

        struct Device: Encodable {
            let channel: String
            let token: String
        }
    }

    private struct IngestBody: Encodable {
        let distinct_id: String
        let event: String
        let properties: [String: String]
    }

    /// Registers this device's APNs push token with Notification Service.
    ///
    /// - Parameters:
    ///   - distinctId: Stable per-device id (see `Config.distinctId`).
    ///   - apnsTokenHex: The APNs device token as a lowercase hex string.
    static func register(distinctId: String, apnsTokenHex: String) async throws {
        guard let url = URL(string: Config.notificationServiceBaseURL + "/v1/identify") else {
            throw RegisterError.badURL
        }

        let body = IdentifyBody(
            distinct_id: distinctId,
            properties: ["app": "swift"],
            device: .init(channel: "apns", token: apnsTokenHex)
        )

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(Config.notificationServiceApiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw RegisterError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw RegisterError.http(status: -1, body: "No HTTP response")
        }

        guard (200...299).contains(http.statusCode) else {
            let bodyText = String(data: data, encoding: .utf8) ?? ""
            throw RegisterError.http(status: http.statusCode, body: bodyText)
        }
    }

    /// Sends an event to Notification Service's `POST /v1/ingest` endpoint.
    ///
    /// - Parameters:
    ///   - distinctId: The SAME stable id used at `/v1/identify` (see `Config.distinctId`).
    ///   - event: The event name, e.g. `"todo_completed"`.
    ///   - properties: Arbitrary string properties merged into the event.
    static func ingest(distinctId: String, event: String, properties: [String: String]) async throws {
        guard let url = URL(string: Config.notificationServiceBaseURL + "/v1/ingest") else {
            throw RegisterError.badURL
        }

        let body = IngestBody(
            distinct_id: distinctId,
            event: event,
            properties: properties
        )

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(Config.notificationServiceApiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw RegisterError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw RegisterError.http(status: -1, body: "No HTTP response")
        }

        guard (200...299).contains(http.statusCode) else {
            let bodyText = String(data: data, encoding: .utf8) ?? ""
            throw RegisterError.http(status: http.statusCode, body: bodyText)
        }
    }
}
