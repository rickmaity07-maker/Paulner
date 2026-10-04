package com.paulanerroute66.deckel.ui.settings

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.paulanerroute66.deckel.BuildConfig
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.payments.ReaderMode
import com.paulanerroute66.deckel.payments.ReaderState
import com.paulanerroute66.deckel.ui.AppViewModel
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.Avatar
import com.paulanerroute66.deckel.ui.components.ButtonKind
import com.paulanerroute66.deckel.ui.components.Card
import com.paulanerroute66.deckel.ui.components.Eyebrow
import com.paulanerroute66.deckel.ui.components.PillButton
import com.paulanerroute66.deckel.ui.components.Segmented
import com.paulanerroute66.deckel.ui.tabs.ConfirmDialog
import com.paulanerroute66.deckel.ui.theme.Route66

@Composable
fun SettingsScreen(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    var confirmOut by remember { mutableStateOf(false) }
    // Tap to Pay needs location access before the reader may connect.
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { vm.setReaderMode(ReaderMode.TapToPay) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(strings.settings.title, style = MaterialTheme.typography.displaySmall)
        Card {
            Row {
                Avatar(state.user?.displayName ?: "", size = 56.dp)
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Eyebrow(strings.settings.account, color = Route66.Muted)
                    Text(state.user?.displayName ?: "", style = MaterialTheme.typography.titleLarge)
                    Text("${state.user?.email} · ${strings.settings.role(state.user?.role ?: "")}", color = Route66.Muted)
                }
                PillButton(strings.settings.signOut, { confirmOut = true }, kind = ButtonKind.Danger, icon = Icons.AutoMirrored.Rounded.Logout, testTag = "sign-out")
            }
        }
        Card {
            Column {
                Eyebrow(strings.settings.language, color = Route66.Muted)
                Spacer(Modifier.height(10.dp))
                Segmented(listOf("de" to "Deutsch", "en" to "English"), state.language, vm::setLanguage, Modifier.width(360.dp), testTagPrefix = "settings-lang")
            }
        }
        Card {
            Column {
                Eyebrow(strings.settings.reader, color = Route66.Muted)
                Spacer(Modifier.height(6.dp))
                Text(strings.settings.readerHint, color = Route66.Muted)
                Spacer(Modifier.height(12.dp))
                Segmented(
                    listOf(ReaderMode.Off to strings.settings.readerOff, ReaderMode.Simulator to strings.settings.readerSimulator, ReaderMode.TapToPay to strings.settings.readerTapToPay),
                    state.readerMode,
                    { mode -> if (mode == ReaderMode.TapToPay) permission.launch(Manifest.permission.ACCESS_FINE_LOCATION) else vm.setReaderMode(mode) },
                    Modifier.width(620.dp),
                    testTagPrefix = "reader",
                )
                Spacer(Modifier.height(12.dp))
                val status = when (val s = state.readerState) {
                    ReaderState.Off -> strings.settings.notConnected
                    ReaderState.Connecting -> strings.settings.connecting
                    is ReaderState.Connected -> strings.settings.connected(s.label) + if (s.simulated) " · ${strings.pay.simulated}" else ""
                    is ReaderState.Failed -> if (state.readerMode == ReaderMode.TapToPay && s.message.contains("tap_to_pay", true)) strings.settings.ttpUnsupported else strings.error(s.message)
                }
                Text("${strings.settings.readerStatus}: $status", style = MaterialTheme.typography.titleSmall, modifier = Modifier.testTag("reader-status"),
                    color = if (state.readerState is ReaderState.Connected) Route66.Green else if (state.readerState is ReaderState.Failed) Route66.Crimson else Route66.Ink)
                if (state.readerMode != ReaderMode.Off && state.readerState !is ReaderState.Connected) {
                    Spacer(Modifier.height(10.dp))
                    PillButton(strings.settings.connect, vm::reconnectReader, kind = ButtonKind.Blue)
                }
            }
        }
        Card {
            Column {
                Text("${strings.settings.server}: ${BuildConfig.API_URL}", color = Route66.Muted)
                Text("${strings.settings.version}: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", color = Route66.Muted)
                Spacer(Modifier.height(12.dp))
                PillButton(strings.update.check, vm::checkForUpdates, kind = ButtonKind.Secondary, testTag = "check-updates")
            }
        }
    }
    if (confirmOut) ConfirmDialog(strings.settings.signOutConfirm, strings.settings.signOut, true, onConfirm = { confirmOut = false; vm.signOut() }, onDismiss = { confirmOut = false })
}
