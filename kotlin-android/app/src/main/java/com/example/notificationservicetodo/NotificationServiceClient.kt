package com.example.notificationservicetodo

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Thin client for the Notification Service `POST /v1/identify` endpoint.
 *
 * Uses [HttpURLConnection] to avoid an extra networking dependency. All work runs
 * on [Dispatchers.IO].
 */
object NotificationServiceClient {

    /**
     * Registers this device's FCM push token with Notification Service.
     *
     * @param distinctId Stable per-device id (see [Config.distinctId]).
     * @param fcmToken The Firebase Cloud Messaging registration token.
     * @throws NotificationServiceException on a transport failure or non-2xx response.
     */
    suspend fun register(distinctId: String, fcmToken: String): Unit = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("distinct_id", distinctId)
            put("properties", JSONObject().put("app", "kotlin-android"))
            put(
                "device",
                JSONObject().apply {
                    put("channel", "fcm")
                    put("token", fcmToken)
                }
            )
        }.toString()

        val url = URL(Config.NOTIFICATION_SERVICE_BASE_URL.trimEnd('/') + "/v1/identify")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 15_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer ${Config.NOTIFICATION_SERVICE_API_KEY}")
        }

        try {
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

            val status = connection.responseCode
            if (status !in 200..299) {
                val errorText = (connection.errorStream ?: connection.inputStream)
                    ?.bufferedReader()
                    ?.use { it.readText() }
                    .orEmpty()
                throw NotificationServiceException("Notification Service returned HTTP $status: $errorText")
            }
        } catch (e: NotificationServiceException) {
            throw e
        } catch (e: Exception) {
            throw NotificationServiceException("Failed to reach Notification Service: ${e.message}", e)
        } finally {
            connection.disconnect()
        }
    }

    /**
     * Fires an analytics event to Notification Service via `POST /v1/ingest`.
     *
     * @param distinctId Stable per-device id (see [Config.distinctId]); MUST match the id
     *   used at `/v1/identify` so the push targets the right devices.
     * @param event The event name, e.g. `todo_completed`.
     * @param properties Arbitrary string properties attached to the event.
     * @throws NotificationServiceException on a transport failure or non-2xx response.
     */
    suspend fun ingest(
        distinctId: String,
        event: String,
        properties: Map<String, String>,
    ): Unit = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("distinct_id", distinctId)
            put("event", event)
            put(
                "properties",
                JSONObject().apply { properties.forEach { (key, value) -> put(key, value) } }
            )
        }.toString()

        val url = URL(Config.NOTIFICATION_SERVICE_BASE_URL.trimEnd('/') + "/v1/ingest")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 15_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer ${Config.NOTIFICATION_SERVICE_API_KEY}")
        }

        try {
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

            val status = connection.responseCode
            if (status !in 200..299) {
                val errorText = (connection.errorStream ?: connection.inputStream)
                    ?.bufferedReader()
                    ?.use { it.readText() }
                    .orEmpty()
                throw NotificationServiceException("Notification Service returned HTTP $status: $errorText")
            }
        } catch (e: NotificationServiceException) {
            throw e
        } catch (e: Exception) {
            throw NotificationServiceException("Failed to reach Notification Service: ${e.message}", e)
        } finally {
            connection.disconnect()
        }
    }
}

/** Raised when registration with Notification Service fails. */
class NotificationServiceException(message: String, cause: Throwable? = null) : Exception(message, cause)
