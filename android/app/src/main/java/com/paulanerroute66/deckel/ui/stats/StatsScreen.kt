package com.paulanerroute66.deckel.ui.stats

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paulanerroute66.deckel.data.Money
import com.paulanerroute66.deckel.data.Stats
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.AppViewModel
import com.paulanerroute66.deckel.ui.StatsRange
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.Card
import com.paulanerroute66.deckel.ui.components.FilterChip
import com.paulanerroute66.deckel.ui.components.MoneyText
import com.paulanerroute66.deckel.ui.components.SectionTitle
import com.paulanerroute66.deckel.ui.components.Stat
import com.paulanerroute66.deckel.ui.theme.GeistMono
import com.paulanerroute66.deckel.ui.theme.Route66

/* The night (or week) in numbers: takings, tips, open tabs, debts, best sellers, busiest hours. */
@Composable
fun StatsScreen(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    LaunchedEffect(Unit) { vm.loadStats(state.statsRange) }
    val s = state.stats
    val money = { c: Int -> Money.format(c, strings.code) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(strings.stats.title, style = MaterialTheme.typography.displaySmall, modifier = Modifier.weight(1f))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(StatsRange.Today to strings.stats.today, StatsRange.Yesterday to strings.stats.yesterday, StatsRange.Week to strings.stats.week, StatsRange.Month to strings.stats.month)
                    .forEach { (r, label) -> FilterChip(label, state.statsRange == r, { vm.loadStats(r) }, Modifier.testTag("range-$r")) }
            }
        }
        Spacer(Modifier.height(20.dp))
        if (s == null) return@Column
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Stat(strings.stats.revenue, money(s.revenueCents), Modifier.weight(1f).testTag("stat-revenue"), accent = Route66.Crimson, sub = "${s.paymentCount} ${strings.stats.payments}")
            Stat(strings.stats.tips, money(s.tipsCents), Modifier.weight(1f))
            Stat(strings.stats.openTabs, money(s.openTabs.balanceCents), Modifier.weight(1f), sub = "${s.openTabs.count}")
            Stat(strings.stats.onAccount, money(s.debts.balanceCents), Modifier.weight(1f), accent = Route66.Blue, sub = strings.stats.guestsCount(s.debts.guests))
            Stat(strings.stats.voids, "${s.voids.count}", Modifier.weight(1f), sub = money(s.voids.amountCents))
        }
        Spacer(Modifier.height(16.dp))
        if (s.revenueCents == 0 && s.topDrinks.isEmpty()) {
            Text(strings.stats.noData, color = Route66.Muted, modifier = Modifier.padding(24.dp))
            return@Column
        }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Card(Modifier.weight(1.4f)) { Column { SectionTitle(strings.stats.byHour); Spacer(Modifier.height(12.dp)); HourChart(s) } }
            Card(Modifier.weight(1f)) {
                Column {
                    SectionTitle(strings.stats.byMethod)
                    Spacer(Modifier.height(12.dp))
                    val max = s.byMethod.maxOfOrNull { it.amount }?.coerceAtLeast(1) ?: 1
                    s.byMethod.forEach { m ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(vm.methodName(m.method), modifier = Modifier.width(130.dp))
                            Box(Modifier.weight(1f).height(14.dp).clip(RoundedCornerShape(4.dp)).background(Route66.Ink.copy(alpha = 0.06f))) {
                                Box(Modifier.fillMaxWidth(m.amount / max.toFloat()).height(14.dp).background(Route66.Blue))
                            }
                            Spacer(Modifier.width(10.dp))
                            MoneyText(m.amount, fontSize = 14.sp)
                        }
                        Spacer(Modifier.height(10.dp))
                    }
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        Card(Modifier.fillMaxWidth()) {
            Column {
                SectionTitle(strings.stats.topDrinks)
                Spacer(Modifier.height(10.dp))
                val max = s.topDrinks.maxOfOrNull { it.qty }?.coerceAtLeast(1) ?: 1
                s.topDrinks.forEachIndexed { i, d ->
                    Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("${i + 1}", fontFamily = GeistMono, color = Route66.Muted, modifier = Modifier.width(28.dp))
                        Text("${d.name} ${d.size}", modifier = Modifier.width(260.dp))
                        Box(Modifier.weight(1f).height(14.dp).clip(RoundedCornerShape(4.dp)).background(Route66.Ink.copy(alpha = 0.06f))) {
                            Box(Modifier.fillMaxWidth(d.qty / max.toFloat()).height(14.dp).background(Route66.Crimson))
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(strings.stats.sold(d.qty), fontFamily = GeistMono, modifier = Modifier.width(56.dp))
                        MoneyText(d.revenue, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}

/* Revenue per hour as thin blue bars with rounded tops, one per hour of business. */
@Composable
private fun HourChart(s: Stats) {
    val strings = LocalStrings.current
    val hours = if (s.hourly.isEmpty()) emptyList() else (s.hourly.minOf { it.hour }..s.hourly.maxOf { it.hour }).toList()
    val byHour = s.hourly.associate { it.hour to it.amount }
    val max = (byHour.values.maxOrNull() ?: 1).coerceAtLeast(1)
    Column {
        Canvas(Modifier.fillMaxWidth().height(180.dp).testTag("hour-chart")) {
            if (hours.isEmpty()) return@Canvas
            val slot = size.width / hours.size
            val bar = (slot * 0.6f).coerceAtMost(40f)
            drawLine(Route66.Ink.copy(alpha = 0.25f), Offset(0f, size.height), Offset(size.width, size.height), 2f)
            hours.forEachIndexed { i, h ->
                val v = byHour[h] ?: 0
                val height = size.height * v / max
                drawRoundRect(Route66.Blue, Offset(i * slot + (slot - bar) / 2, size.height - height), Size(bar, height), CornerRadius(8f, 8f))
            }
        }
        Row(Modifier.fillMaxWidth()) { hours.forEach { h -> Text("$h", Modifier.weight(1f), fontFamily = GeistMono, fontSize = 11.sp, color = Route66.Muted, textAlign = androidx.compose.ui.text.style.TextAlign.Center) } }
        if (hours.isNotEmpty()) Text("max ${Money.format(max, strings.code)}", color = Route66.Muted, style = MaterialTheme.typography.bodySmall)
    }
}
