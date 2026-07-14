package com.example.notificationservicetodo

import android.content.Context
import androidx.core.content.edit
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** A single todo item. */
data class Todo(
    val id: String = UUID.randomUUID().toString(),
    val text: String,
    val done: Boolean = false,
)

/**
 * Persists the todo list as a JSON array in SharedPreferences. Simple and
 * dependency-free — fine for a demo. Read/write is synchronous and cheap for a
 * short list.
 */
class TodoStore(context: Context) {

    private val prefs =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun load(): List<Todo> {
        val raw = prefs.getString(KEY_TODOS, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    add(
                        Todo(
                            id = obj.getString("id"),
                            text = obj.getString("text"),
                            done = obj.getBoolean("done"),
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    fun save(todos: List<Todo>) {
        val array = JSONArray()
        todos.forEach { todo ->
            array.put(
                JSONObject().apply {
                    put("id", todo.id)
                    put("text", todo.text)
                    put("done", todo.done)
                }
            )
        }
        prefs.edit { putString(KEY_TODOS, array.toString()) }
    }

    private companion object {
        const val PREFS_NAME = "notification_service_todos"
        const val KEY_TODOS = "todos"
    }
}
