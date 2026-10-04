package com.paulanerroute66.deckel.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Insights
import androidx.compose.material.icons.rounded.LocalBar
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.components.LocalCompact
import com.paulanerroute66.deckel.ui.components.OfflineBanner
import com.paulanerroute66.deckel.ui.components.Shield
import com.paulanerroute66.deckel.ui.guests.GuestsScreen
import com.paulanerroute66.deckel.ui.history.HistoryScreen
import com.paulanerroute66.deckel.ui.login.LoginScreen
import com.paulanerroute66.deckel.ui.settings.SettingsScreen
import com.paulanerroute66.deckel.ui.stats.StatsScreen
import com.paulanerroute66.deckel.ui.tabs.TabsScreen
import com.paulanerroute66.deckel.ui.theme.GeistMono
import com.paulanerroute66.deckel.ui.theme.Route66
import kotlinx.coroutines.delay
import java.time.LocalTime
import java.time.format.DateTimeFormatter

@Composable
fun App(vm: AppViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        vm.notices.collect { notice ->
            val result = snackbar.showSnackbar(
                message = notice.text,
                actionLabel = notice.undo?.let { state.strings.common.undo },
                withDismissAction = notice.error,
                duration = if (notice.error) SnackbarDuration.Long else SnackbarDuration.Short,
            )
            if (result == SnackbarResult.ActionPerformed) notice.undo?.invoke()
        }
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        CompositionLocalProvider(LocalStrings provides state.strings, LocalCompact provides (maxWidth < 600.dp)) {
            Box(Modifier.fillMaxSize().background(Route66.Cream)) {
                AnimatedContent(state.phase, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "phase") { phase ->
                    when (phase) {
                        Phase.Loading -> Box(Modifier.fillMaxSize().background(Route66.Asphalt))
                        Phase.SignedOut -> LoginScreen(state, vm::login, vm::setLanguage)
                        Phase.SignedIn -> Shell(state, vm)
                    }
                }
                // Updates sit above every screen, sign-in included: a mandatory one must be installable before anyone logs in.
                if (state.phase != Phase.Loading) com.paulanerroute66.deckel.updates.UpdateLayer(state, vm)
                // Top of the screen: at the bottom it would cover the pay and close buttons. On a phone a little lower, clear of the bill/menu switch.
                SnackbarHost(snackbar, Modifier.align(Alignment.TopCenter).padding(top = if (LocalCompact.current) 120.dp else 28.dp).testTag("snackbar"))
            }
        }
    }
}

/*
  Tablet: asphalt navigation rail on the left (like the website's side rail), the current screen on the right.
  Phone: the screen on top, the same destinations in an asphalt bar along the bottom.
*/
@Composable
private fun Shell(state: UiState, vm: AppViewModel) {
    if (LocalCompact.current) PhoneShell(state, vm) else TabletShell(state, vm)
}

@Composable
private fun CurrentScreen(state: UiState, vm: AppViewModel) {
    when (state.screen) {
        Screen.Tabs -> TabsScreen(state, vm)
        Screen.Guests -> GuestsScreen(state, vm)
        Screen.Stats -> StatsScreen(state, vm)
        Screen.History -> HistoryScreen(state, vm)
        Screen.Settings -> SettingsScreen(state, vm)
    }
}

@Composable
private fun BusyLine(state: UiState) {
    OfflineBanner(state.offline)
    Box(Modifier.height(3.dp)) {
        if (state.busy) LinearProgressIndicator(Modifier.fillMaxSize(), color = Route66.Crimson, trackColor = Color.Transparent)
    }
}

@Composable
private fun PhoneShell(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    // Back from any other screen returns to the tabs, the phone's home screen.
    BackHandler(enabled = state.screen != Screen.Tabs) { vm.go(Screen.Tabs) }
    Column(Modifier.fillMaxSize()) {
        Column(Modifier.weight(1f).windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))) {
            BusyLine(state)
            Box(Modifier.weight(1f)) { CurrentScreen(state, vm) }
        }
        Row(Modifier.fillMaxWidth().background(Route66.Asphalt).navigationBarsPadding().padding(horizontal = 6.dp, vertical = 6.dp)) {
            BarItem(Icons.Rounded.LocalBar, strings.nav.tabs, state.screen == Screen.Tabs, badge = state.openTabs.size.takeIf { it > 0 }, tag = "nav-tabs") { vm.go(Screen.Tabs) }
            BarItem(Icons.Rounded.Groups, strings.nav.guests, state.screen == Screen.Guests, tag = "nav-guests") { vm.go(Screen.Guests) }
            BarItem(Icons.Rounded.Insights, strings.nav.stats, state.screen == Screen.Stats, tag = "nav-stats") { vm.go(Screen.Stats) }
            BarItem(Icons.Rounded.History, strings.nav.history, state.screen == Screen.History, tag = "nav-history") { vm.go(Screen.History) }
            BarItem(Icons.Rounded.Settings, strings.nav.settings, state.screen == Screen.Settings, tag = "nav-settings") { vm.go(Screen.Settings) }
        }
    }
}

@Composable
private fun RowScope.BarItem(icon: ImageVector, label: String, selected: Boolean, badge: Int? = null, tag: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = if (selected) Route66.Crimson else Color.Transparent,
        contentColor = if (selected) Route66.Chrome else Route66.Chrome.copy(alpha = 0.65f),
        modifier = Modifier.weight(1f).padding(horizontal = 2.dp).testTag(tag),
    ) {
        Column(Modifier.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box {
                Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp))
                if (badge != null) {
                    Box(
                        Modifier.align(Alignment.TopEnd).padding(start = 16.dp).background(Route66.Gold, RoundedCornerShape(10.dp)).padding(horizontal = 5.dp),
                    ) { Text("$badge", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Route66.Asphalt) }
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, maxLines = 1, fontSize = 10.sp, letterSpacing = 0.sp)
        }
    }
}

@Composable
private fun TabletShell(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    Row(Modifier.fillMaxSize()) {
        Column(
            Modifier.fillMaxHeight().width(112.dp).background(Route66.Asphalt).safeDrawingPadding().padding(vertical = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Shield(size = 52.dp)
            Spacer(Modifier.height(6.dp))
            Text("DECKEL", style = MaterialTheme.typography.labelSmall, color = Route66.Chrome.copy(alpha = 0.6f))
            Spacer(Modifier.height(28.dp))
            RailItem(Icons.Rounded.LocalBar, strings.nav.tabs, state.screen == Screen.Tabs, badge = state.openTabs.size.takeIf { it > 0 }, tag = "nav-tabs") { vm.go(Screen.Tabs) }
            RailItem(Icons.Rounded.Groups, strings.nav.guests, state.screen == Screen.Guests, tag = "nav-guests") { vm.go(Screen.Guests) }
            RailItem(Icons.Rounded.Insights, strings.nav.stats, state.screen == Screen.Stats, tag = "nav-stats") { vm.go(Screen.Stats) }
            RailItem(Icons.Rounded.History, strings.nav.history, state.screen == Screen.History, tag = "nav-history") { vm.go(Screen.History) }
            Spacer(Modifier.weight(1f))
            Clock()
            Spacer(Modifier.height(16.dp))
            RailItem(Icons.Rounded.Settings, strings.nav.settings, state.screen == Screen.Settings, tag = "nav-settings") { vm.go(Screen.Settings) }
        }
        Column(Modifier.weight(1f).fillMaxHeight()) {
            BusyLine(state)
            Box(Modifier.weight(1f).safeDrawingPadding()) { CurrentScreen(state, vm) }
        }
    }
}

@Composable
private fun RailItem(icon: ImageVector, label: String, selected: Boolean, badge: Int? = null, tag: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (selected) Route66.Crimson else Color.Transparent,
        contentColor = if (selected) Route66.Chrome else Route66.Chrome.copy(alpha = 0.65f),
        modifier = Modifier.padding(vertical = 4.dp).width(92.dp).testTag(tag),
    ) {
        Column(Modifier.padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box {
                Icon(icon, contentDescription = null, modifier = Modifier.size(26.dp))
                if (badge != null) {
                    Box(
                        Modifier.align(Alignment.TopEnd).padding(start = 18.dp).background(Route66.Gold, RoundedCornerShape(10.dp)).padding(horizontal = 6.dp, vertical = 1.dp),
                    ) { Text("$badge", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Route66.Asphalt) }
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
    }
}

@Composable
private fun Clock() {
    var now by remember { mutableStateOf(LocalTime.now()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(1_000)
            now = LocalTime.now()
        }
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(now.format(DateTimeFormatter.ofPattern("HH:mm")), fontFamily = GeistMono, color = Route66.Chrome, fontSize = 22.sp, fontWeight = FontWeight.Medium)
    }
}
