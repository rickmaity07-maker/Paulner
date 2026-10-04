package com.paulanerroute66.deckel.ui.history

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.LockOpen
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paulanerroute66.deckel.data.TabStatus
import com.paulanerroute66.deckel.data.Times
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.AppViewModel
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.Badge
import com.paulanerroute66.deckel.ui.components.ButtonKind
import com.paulanerroute66.deckel.ui.components.DashedDivider
import com.paulanerroute66.deckel.ui.components.Divider
import com.paulanerroute66.deckel.ui.components.EmptyState
import com.paulanerroute66.deckel.ui.components.Eyebrow
import com.paulanerroute66.deckel.ui.components.MoneyText
import com.paulanerroute66.deckel.ui.components.PillButton
import com.paulanerroute66.deckel.ui.theme.Route66

/* Closed tabs day by day, read-only; owners can reopen one that was closed by mistake. */
@Composable
fun HistoryScreen(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    LaunchedEffect(Unit) { vm.loadHistory(state.historyDate) }
    Row(Modifier.fillMaxSize()) {
        Column(Modifier.weight(0.4f).fillMaxHeight().background(Route66.Paper.copy(alpha = 0.5f)).padding(18.dp)) {
            Text(strings.history.title, style = MaterialTheme.typography.displaySmall)
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton({ vm.loadHistory(state.historyDate.minusDays(1)) }, Modifier.testTag("history-prev")) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowLeft, null) }
                Text(Times.day(state.historyDate, strings.code), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                IconButton({ vm.loadHistory(state.historyDate.plusDays(1)) }, enabled = state.historyDate < Times.today()) { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, null) }
            }
            if (state.historyTabs.isEmpty()) EmptyState(strings.history.empty, "", showShield = false)
            LazyColumn(Modifier.testTag("history-list")) {
                items(state.historyTabs, key = { it.id }) { t ->
                    Row(
                        Modifier.fillMaxWidth().background(if (state.historySelected?.id == t.id) Route66.Blue.copy(alpha = 0.12f) else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(14.dp))
                            .clickable { vm.selectHistory(t.id) }.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(t.label, style = MaterialTheme.typography.titleSmall)
                            Text("#${t.number} · ${Times.clock(t.openedAt)}–${Times.clock(t.closedAt)}", color = Route66.Muted, style = MaterialTheme.typography.bodySmall)
                        }
                        StatusBadge(t.status)
                        Spacer(Modifier.width(10.dp))
                        MoneyText(t.totalCents, fontSize = 15.sp)
                    }
                    Divider()
                }
            }
        }
        Box(Modifier.width(1.dp).fillMaxHeight().background(Route66.Ink.copy(alpha = 0.08f)))
        val tab = state.historySelected
        Box(Modifier.weight(0.6f).fillMaxHeight()) {
            if (tab == null) EmptyState(strings.history.pick, "") else Column(Modifier.padding(24.dp)) {
                Eyebrow("${strings.tabs.number(tab.number)} · ${strings.history.readOnly}")
                Text(tab.label, style = MaterialTheme.typography.displaySmall)
                Spacer(Modifier.height(12.dp))
                LazyColumn(Modifier.weight(1f)) {
                    items(tab.items, key = { it.id }) { i ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                            Text("${i.qty}× ${i.name}${if (i.voided) " (${strings.tabs.voided})" else if (i.onHouse) " (${strings.tabs.onHouse})" else ""}", modifier = Modifier.weight(1f), color = if (i.voided) Route66.Muted else Route66.Ink)
                            MoneyText(i.lineCents, fontSize = 15.sp)
                        }
                    }
                    items(tab.payments, key = { "p" + it.id }) { p ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                            Text("${vm.methodName(p.method)} · ${Times.clock(p.takenAt)} · ${p.takenBy}", modifier = Modifier.weight(1f), color = Route66.Green)
                            MoneyText(-p.amountCents, fontSize = 15.sp, color = Route66.Green, strike = p.refunded)
                        }
                    }
                }
                DashedDivider()
                Row(Modifier.padding(vertical = 10.dp)) {
                    Text(strings.tabs.total, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                    MoneyText(tab.totalCents, fontSize = 26.sp)
                }
                if (state.isOwner && tab.status != TabStatus.Open) {
                    PillButton(strings.tabs.reopen, { vm.reopenFromHistory(tab) }, kind = ButtonKind.Secondary, icon = Icons.Rounded.LockOpen, testTag = "history-reopen")
                }
            }
        }
    }
}

@Composable
private fun StatusBadge(status: TabStatus) {
    val strings = LocalStrings.current
    when (status) {
        TabStatus.Closed -> Badge(strings.tabs.closed, Route66.Green)
        TabStatus.OnAccount -> Badge(strings.tabs.onAccount, Route66.Blue)
        TabStatus.Void -> Badge(strings.tabs.voidStatus, Route66.Muted)
        TabStatus.Open -> Badge(strings.tabs.open, Route66.Gold, onColor = Route66.Asphalt)
    }
}
