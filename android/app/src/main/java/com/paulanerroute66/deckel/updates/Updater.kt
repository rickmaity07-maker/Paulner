package com.paulanerroute66.deckel.updates

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.paulanerroute66.deckel.BuildConfig
import com.paulanerroute66.deckel.DeckelApp
import com.paulanerroute66.deckel.data.Api
import com.paulanerroute66.deckel.data.ApiException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

@Serializable
data class Release(
    val versionCode: Int,
    val versionName: String,
    val url: String,
    val sha256: String,
    val sizeBytes: Long,
    val notes: String = "",
    val notesEn: String = "",
    val mandatory: Boolean = false,
)

@Serializable
data class UpdateInfo(val latest: Release? = null, val minSupportedVersionCode: Int = 0, val mustUpdate: Boolean = false)

sealed interface UpdateState {
    data object Idle : UpdateState
    data class Available(val release: Release, val mandatory: Boolean) : UpdateState
    data class Downloading(val release: Release, val progress: Float) : UpdateState
    data class Installing(val release: Release) : UpdateState
    data class NeedsPermission(val release: Release) : UpdateState
    data class Failed(val release: Release, val reason: String) : UpdateState
}

/*
  Online updates without the Play Store. The website lists published versions
  (/api/app/version); the newest higher versionCode is downloaded, its SHA-256 is
  checked against the published one, and Android's PackageInstaller installs it
  over the running app. Android itself refuses anything not signed with the same
  release key, so a tampered file can't get in even if the download were hijacked.
*/
class Updater(private val context: Context, private val api: Api) {
    private val _state = MutableStateFlow<UpdateState>(UpdateState.Idle)
    val state: StateFlow<UpdateState> = _state
    private val http = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(60, TimeUnit.SECONDS).build()
    private val dir get() = File(context.cacheDir, "updates").apply { mkdirs() }

    val currentVersion get() = BuildConfig.VERSION_CODE

    /* Asks the website whether there's something newer. Quietly does nothing when offline. */
    suspend fun check(): UpdateState {
        val info = try {
            api.updateInfo(currentVersion)
        } catch (e: ApiException) {
            return _state.value
        }
        val latest = info.latest
        // Don't interrupt a download or install that's already under way.
        if (_state.value is UpdateState.Downloading || _state.value is UpdateState.Installing) return _state.value
        // mustUpdate: this version is older than the newest mandatory one, so the app is locked until it updates.
        _state.value = if (latest == null) UpdateState.Idle else UpdateState.Available(latest, info.mustUpdate)
        return _state.value
    }

    fun canInstall() = context.packageManager.canRequestPackageInstalls()

    /* Opens the one-time "allow installs from this app" screen. */
    fun permissionIntent() = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    suspend fun downloadAndInstall(release: Release) {
        if (!canInstall()) {
            _state.value = UpdateState.NeedsPermission(release)
            return
        }
        try {
            val apk = download(release)
            _state.value = UpdateState.Installing(release)
            install(apk)
        } catch (e: UpdateException) {
            _state.value = UpdateState.Failed(release, e.reason)
        } catch (e: IOException) {
            _state.value = UpdateState.Failed(release, "offline")
        }
    }

    private suspend fun download(release: Release): File = withContext(Dispatchers.IO) {
        val target = File(dir, "deckel-${release.versionCode}.apk")
        // A complete, verified file from an earlier attempt can be reused.
        if (target.exists() && target.length() == release.sizeBytes && sha256(target) == release.sha256.lowercase()) return@withContext target
        dir.listFiles()?.forEach { it.delete() }
        val partial = File(dir, "deckel-${release.versionCode}.part")
        _state.value = UpdateState.Downloading(release, 0f)
        http.newCall(Request.Builder().url(release.url).build()).execute().use { response ->
            if (!response.isSuccessful) throw UpdateException("download_${response.code}")
            val body = response.body ?: throw UpdateException("download_empty")
            val total = body.contentLength().takeIf { it > 0 } ?: release.sizeBytes
            body.byteStream().use { input ->
                partial.outputStream().use { output ->
                    val buffer = ByteArray(64 * 1024)
                    var done = 0L
                    var lastReported = 0f
                    while (true) {
                        val n = input.read(buffer)
                        if (n < 0) break
                        output.write(buffer, 0, n)
                        done += n
                        val progress = (done.toFloat() / total).coerceIn(0f, 1f)
                        if (progress - lastReported > 0.01f) {
                            lastReported = progress
                            _state.value = UpdateState.Downloading(release, progress)
                        }
                    }
                }
            }
        }
        if (sha256(partial) != release.sha256.lowercase()) {
            partial.delete()
            throw UpdateException("checksum")
        }
        partial.renameTo(target)
        target
    }

    private fun install(apk: File) {
        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
            // Android 12+: once this app installed itself, later updates may go through without a confirmation tap.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            session.openWrite("deckel.apk", 0, apk.length()).use { out ->
                apk.inputStream().use { it.copyTo(out) }
                session.fsync(out)
            }
            val intent = Intent(context, InstallReceiver::class.java).setPackage(context.packageName)
            val pending = PendingIntent.getBroadcast(context, sessionId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
            session.commit(pending.intentSender)
        }
    }

    internal fun onInstallResult(status: Int, message: String?) {
        val release = when (val s = _state.value) {
            is UpdateState.Installing -> s.release
            is UpdateState.Downloading -> s.release
            else -> return
        }
        // On success Android restarts the app in the new version, so only failures land here.
        if (status != PackageInstaller.STATUS_SUCCESS && status != PackageInstaller.STATUS_PENDING_USER_ACTION) {
            _state.value = UpdateState.Failed(release, if (status == PackageInstaller.STATUS_FAILURE_ABORTED) "aborted" else message ?: "install")
        }
    }

    fun dismissFailure() {
        (_state.value as? UpdateState.Failed)?.let { _state.value = UpdateState.Available(it.release, false) }
    }

    private class UpdateException(val reason: String) : Exception(reason)

    companion object {
        fun sha256(file: File): String {
            val digest = MessageDigest.getInstance("SHA-256")
            file.inputStream().use { input ->
                val buffer = ByteArray(64 * 1024)
                while (true) {
                    val n = input.read(buffer)
                    if (n < 0) break
                    digest.update(buffer, 0, n)
                }
            }
            return digest.digest().joinToString("") { "%02x".format(it) }
        }
    }
}

/* Receives the installer's answer: asks the user to confirm when Android wants it, reports failures back. */
class InstallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            @Suppress("DEPRECATION")
            val confirm = if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java) else intent.getParcelableExtra(Intent.EXTRA_INTENT)
            confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)?.let(context::startActivity)
        }
        (context.applicationContext as? DeckelApp)?.container?.updater?.onInstallResult(status, intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE))
    }
}
