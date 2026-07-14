package com.example.notificationservicetodo

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

/** Notification channel helpers shared by the activity and the FCM service. */
object Notifications {

    /** Channel id — must match `default_notification_channel_id` in strings.xml. */
    const val CHANNEL_ID = "notification_service_default"

    /**
     * Creates the default notification channel. Safe to call repeatedly; on
     * Android versions below O this is a no-op.
     */
    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.default_notification_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = context.getString(R.string.default_notification_channel_desc)
        }
        manager.createNotificationChannel(channel)
    }
}
