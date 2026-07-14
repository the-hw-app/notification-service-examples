package com.example.notificationservicetodo

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.example.notificationservicetodo.ui.theme.NotificationServiceTodoTheme
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // The default channel must exist before any notification can be posted.
        Notifications.ensureChannel(this)

        enableEdgeToEdge()
        setContent {
            NotificationServiceTodoTheme {
                TodoScreen()
            }
        }
    }
}

/** UI-facing status of the "Enable notifications" flow. */
private sealed interface RegistrationState {
    data object Idle : RegistrationState
    data object Working : RegistrationState
    data object Registered : RegistrationState
    data class Error(val message: String) : RegistrationState
}

/** Fetches the current FCM registration token without an extra coroutine adapter. */
private suspend fun fetchFcmToken(): String = suspendCancellableCoroutine { cont ->
    FirebaseMessaging.getInstance().token
        .addOnSuccessListener { token -> cont.resume(token) }
        .addOnFailureListener { error -> cont.resumeWithException(error) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TodoScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val store = remember { TodoStore(context) }

    val todos = remember { mutableStateListOf<Todo>().apply { addAll(store.load()) } }
    var input by remember { mutableStateOf("") }
    var registration by remember { mutableStateOf<RegistrationState>(RegistrationState.Idle) }

    // Persist the list whenever it changes.
    LaunchedEffect(Unit) {
        snapshotFlow { todos.toList() }.collect { store.save(it) }
    }

    fun addTodo() {
        val text = input.trim()
        if (text.isEmpty()) return
        todos.add(Todo(text = text))
        input = ""
    }

    // Fires a `todo_completed` event when a todo transitions to done. No-op on un-toggle.
    fun notifyCompleted(todo: Todo) {
        scope.launch {
            try {
                NotificationServiceClient.ingest(
                    distinctId = Config.distinctId(context),
                    event = "todo_completed",
                    properties = mapOf(
                        "title" to todo.text,
                        "app" to "kotlin-android",
                        "id" to todo.id,
                    ),
                )
            } catch (e: Exception) {
                Log.w("Notification Service", "Failed to send todo_completed event", e)
            }
        }
    }

    fun toggle(todo: Todo) {
        val index = todos.indexOfFirst { it.id == todo.id }
        if (index < 0) return
        val updated = todos[index].copy(done = !todos[index].done)
        todos[index] = updated
        if (updated.done) notifyCompleted(updated)
    }

    fun delete(todo: Todo) {
        todos.removeAll { it.id == todo.id }
    }

    // Runs the token fetch + Notification Service registration once permission is settled.
    fun registerWithNotificationService() {
        registration = RegistrationState.Working
        scope.launch {
            registration = try {
                val token = fetchFcmToken()
                NotificationServiceClient.register(Config.distinctId(context), token)
                RegistrationState.Registered
            } catch (e: Exception) {
                RegistrationState.Error(e.message ?: "Registration failed")
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            registerWithNotificationService()
        } else {
            registration = RegistrationState.Error(
                context.getString(R.string.notifications_permission_denied)
            )
        }
    }

    fun onEnableNotifications() {
        val needsRuntimePermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        val alreadyGranted = !needsRuntimePermission || ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED

        if (alreadyGranted) {
            registerWithNotificationService()
        } else {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text(stringResource(R.string.app_name)) }) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Add-item row.
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    label = { Text(stringResource(R.string.new_todo_hint)) },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { addTodo() }),
                )
                Spacer(Modifier.width(8.dp))
                Button(onClick = { addTodo() }, enabled = input.isNotBlank()) {
                    Text(stringResource(R.string.add))
                }
            }

            Spacer(Modifier.height(16.dp))

            // Todo list.
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(todos, key = { it.id }) { todo ->
                    TodoRow(
                        todo = todo,
                        onToggle = { toggle(todo) },
                        onDelete = { delete(todo) },
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Notification registration.
            Button(
                onClick = { onEnableNotifications() },
                modifier = Modifier.fillMaxWidth(),
                enabled = registration != RegistrationState.Working,
            ) {
                Text(
                    if (registration == RegistrationState.Working) {
                        stringResource(R.string.enabling_notifications)
                    } else {
                        stringResource(R.string.enable_notifications)
                    }
                )
            }

            val statusText = when (val state = registration) {
                RegistrationState.Idle -> null
                RegistrationState.Working -> stringResource(R.string.status_working)
                RegistrationState.Registered -> stringResource(R.string.status_registered)
                is RegistrationState.Error -> stringResource(R.string.status_error, state.message)
            }
            if (statusText != null) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = statusText,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (registration is RegistrationState.Error) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
        }
    }
}

@Composable
private fun TodoRow(
    todo: Todo,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
) {
    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(checked = todo.done, onCheckedChange = { onToggle() })
            Text(
                text = todo.text,
                modifier = Modifier.weight(1f),
                textDecoration = if (todo.done) TextDecoration.LineThrough else null,
                color = if (todo.done) {
                    MaterialTheme.colorScheme.onSurfaceVariant
                } else {
                    MaterialTheme.colorScheme.onSurface
                },
            )
            IconButton(onClick = onDelete) {
                Icon(
                    imageVector = Icons.Filled.Delete,
                    contentDescription = stringResource(R.string.delete),
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun TodoScreenPreview() {
    NotificationServiceTodoTheme {
        TodoScreen()
    }
}
