package com.paulanerroute66.deckel.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

private val Context.store by preferencesDataStore(name = "deckel")

/* What survives a restart: the sign-in token, who it belongs to, the language and the card reader choice. */
class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("token")
    private val userKey = stringPreferencesKey("user")
    private val languageKey = stringPreferencesKey("language")
    private val readerKey = stringPreferencesKey("reader")
    private val json = Json { ignoreUnknownKeys = true }

    @Volatile var token: String? = null
        private set

    suspend fun load(): Saved {
        val prefs = context.store.data.first()
        token = prefs[tokenKey]
        val user = prefs[userKey]?.let { runCatching { json.decodeFromString<User>(it) }.getOrNull() }
        return Saved(token, user, prefs[languageKey] ?: "de", prefs[readerKey] ?: "")
    }

    suspend fun signIn(token: String, user: User) {
        this.token = token
        context.store.edit { it[tokenKey] = token; it[userKey] = json.encodeToString(User.serializer(), user) }
    }

    suspend fun signOut() {
        token = null
        context.store.edit { it.remove(tokenKey); it.remove(userKey) }
    }

    suspend fun setLanguage(code: String) = context.store.edit { it[languageKey] = code }
    suspend fun setReader(mode: String) = context.store.edit { it[readerKey] = mode }

    data class Saved(val token: String?, val user: User?, val language: String, val reader: String)
}
