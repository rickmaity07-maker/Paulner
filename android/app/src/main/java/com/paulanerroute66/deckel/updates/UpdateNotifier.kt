package com.paulanerroute66.deckel.updates

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.paulanerroute66.deckel.BuildConfig
import com.paulanerroute66.deckel.DeckelApp
import com.paulanerroute66.deckel.MainActivity
import com.paulanerroute66.deckel.R
import com.paulanerroute66.deckel.i18n.stringsFor
import java.util.concurrent.TimeUnit

/*
  "Update available" in the notification bar, on tablets and phones alike, even
  while the app is closed: Android runs this check about every 30 minutes when
  there is internet. Each new version is announced once; tapping the
  notification opens the app, which then offers to install it.
*/
object UpdateNotifier {
    private const val CHANNEL = "updates"
    private const val WORK = "update-check"
    private const val PREFS = "update-notifier"

    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<UpdateCheckWorker>(30, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    /* Shows the notification unless this version was announced already. */
    fun announce(context: Context, release: Release, language: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getInt("announced", 0) >= release.versionCode) return
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val copy = stringsFor(language).update
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL, copy.channel, NotificationManager.IMPORTANCE_DEFAULT))
        val open = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notes = if (language == "en" && release.notesEn.isNotBlank()) release.notesEn else release.notes
        val body = listOf(notes, copy.tapToInstall).filter { it.isNotBlank() }.joinToString("\n")
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_update)
            .setContentTitle(copy.available(release.versionName))
            .setContentText(copy.tapToInstall)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(1066, notification) }
        prefs.edit().putInt("announced", release.versionCode).apply()
    }

    fun dismiss(context: Context) = NotificationManagerCompat.from(context).cancel(1066)
}

class UpdateCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext as? DeckelApp ?: return Result.success()
        val container = app.container
        return runCatching {
            val release = container.api.updateInfo(BuildConfig.VERSION_CODE).latest
            if (release != null && release.versionCode > BuildConfig.VERSION_CODE) {
                UpdateNotifier.announce(applicationContext, release, container.session.load().language)
            }
            Result.success()
        }.getOrElse { Result.retry() }
    }
}
