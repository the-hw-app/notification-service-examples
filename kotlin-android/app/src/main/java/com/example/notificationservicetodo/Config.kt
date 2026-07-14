package com.example.notificationservicetodo

import android.content.Context
import androidx.core.content.edit
import java.util.UUID

/**
 * App-wide configuration for the Notification Service integration.
 *
 * SECURITY: [NOTIFICATION_SERVICE_API_KEY] is a single instance-wide bearer key. Do NOT ship a
 * real key inside a distributed client in production — anyone can extract it from
 * the app package. Front Notification Service with a thin proxy that holds the key server-side,
 * or add a per-device mint endpoint. See README.md.
 */
object Config {

    /** Base URL of the deployed Notification Service instance (no trailing slash). */
    const val NOTIFICATION_SERVICE_BASE_URL = "https://notification-service.YOUR-SUBDOMAIN.workers.dev"

    /** Placeholder API key. Replace with your instance key for local testing only. */
    const val NOTIFICATION_SERVICE_API_KEY = "YOUR_NOTIFICATION_SERVICE_API_KEY"

    private const val PREFS_NAME = "notification_service_prefs"
    private const val KEY_DISTINCT_ID = "distinct_id"

    /**
     * A stable per-device identifier sent as `distinct_id`. Generated once and
     * persisted in SharedPreferences so it survives app relaunches.
     */
    fun distinctId(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.getString(KEY_DISTINCT_ID, null)?.let { return it }

        val fresh = UUID.randomUUID().toString()
        prefs.edit { putString(KEY_DISTINCT_ID, fresh) }
        return fresh
    }
}
