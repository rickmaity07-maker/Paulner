package com.paulanerroute66.deckel.ui.tabs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import com.paulanerroute66.deckel.data.Money
import com.paulanerroute66.deckel.data.PaidItem
import com.paulanerroute66.deckel.data.PayMethod
import com.paulanerroute66.deckel.data.Tab
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.payments.PaymentStep
import com.paulanerroute66.deckel.payments.ReaderState
import com.paulanerroute66.deckel.ui.AppViewModel
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.ButtonKind
import com.paulanerroute66.deckel.ui.components.Eyebrow
import com.paulanerroute66.deckel.ui.components.FilterChip
import com.paulanerroute66.deckel.ui.components.Keypad
import com.paulanerroute66.deckel.ui.components.LocalCompact
import com.paulanerroute66.deckel.ui.components.MoneyText
import com.paulanerroute66.deckel.ui.components.PillButton
import com.paulanerroute66.deckel.ui.components.Segmented
import com.paulanerroute66.deckel.ui.components.applyKey
import com.paulanerroute66.deckel.ui.theme.Route66

/*
  Take payment: amount (all, half, any part), tip, method. Cash shows the change
  to hand back; Tap to Pay hands over to the card reader and shows its progress.
  For a pay-as-you-go round the drinks are booked and paid in one go.
  "Choose drinks" splits the bill: a guest picks what they had and pays just that.
*/

/* Drinks of the same kind and price are one line ("4× Pils"), however many rounds they came in. */
private data class DrinkLine(val key: String, val name: String, val size: String, val unitPriceCents: Int, val items: List<com.paulanerroute66.deckel.data.TabItem>) {
    val open get() = items.sumOf { it.payableQty }
}

private fun drinkLines(tab: Tab) = tab.items.filter { it.payableQty > 0 }
    .groupBy { "${it.name}|${it.size}|${it.unitPriceCents}" }
    .map { (key, items) -> DrinkLine(key, items.first().name, items.first().size, items.first().unitPriceCents, items) }

/* Turns "3 of this line" into the individual tab items, oldest first. */
private fun allocate(lines: List<DrinkLine>, picked: Map<String, Int>): List<PaidItem> = lines.flatMap { line ->
    var left = picked[line.key] ?: 0
    line.items.mapNotNull { item ->
        val take = minOf(left, item.payableQty)
        left -= take
        if (take > 0) PaidItem(item.id, take) else null
    }
}
@Composable
fun PaymentDialog(state: UiState, tab: Tab, request: PayRequest, vm: AppViewModel, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    val due = request.amountCents
    var amount by remember { mutableStateOf(Money.plain(due, "en")) }
    var tip by remember { mutableStateOf(0) }
    var method by remember { mutableStateOf(PayMethod.Cash) }
    var given by remember { mutableStateOf("") }
    val lines = remember(tab) { drinkLines(tab) }
    var byDrinks by remember { mutableStateOf(false) }
    val picked = remember { mutableStateMapOf<String, Int>() }
    val pickedCents = lines.sumOf { (picked[it.key] ?: 0) * it.unitPriceCents }
    val amountCents = if (byDrinks) pickedCents else Money.parse(amount) ?: 0
    val readerReady = state.readerState is ReaderState.Connected
    val step = state.paymentStep

    DialogFrame(strings.pay.title, onDismiss, width = 760.dp, testTag = "pay-dialog") {
        if (step != null) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = Route66.Crimson)
                Spacer(Modifier.height(16.dp))
                Text(
                    when (step) {
                        PaymentStep.Preparing -> strings.common.loading
                        PaymentStep.WaitingForCard -> strings.pay.tapPrompt
                        PaymentStep.Processing -> strings.pay.tapProcessing
                    },
                    style = MaterialTheme.typography.headlineSmall,
                )
                if ((state.readerState as? ReaderState.Connected)?.simulated == true) Text(strings.pay.simulated, color = Route66.Muted)
                Spacer(Modifier.height(16.dp))
                PillButton(strings.pay.tapCancel, vm::cancelCardPayment, kind = ButtonKind.Secondary)
            }
            return@DialogFrame
        }
        val compact = LocalCompact.current
        if (!request.roundOnly && lines.isNotEmpty()) {
            Segmented(listOf(false to strings.pay.byAmount, true to strings.pay.byDrinks), byDrinks, { byDrinks = it; given = "" }, testTagPrefix = "pay-by")
            Spacer(Modifier.height(16.dp))
        }
        val details: @Composable (Modifier) -> Unit = { modifier -> Column(modifier) {
                if (byDrinks) {
                    DrinkPicker(lines, picked)
                    Spacer(Modifier.height(14.dp))
                }
                Eyebrow(strings.pay.due, color = Route66.Muted)
                MoneyText(due, fontSize = 30.sp, color = Route66.Crimson)
                Spacer(Modifier.height(12.dp))
                Eyebrow(strings.pay.amount, color = Route66.Muted)
                MoneyText(amountCents, fontSize = 40.sp)
                if (!request.roundOnly && !byDrinks) FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(strings.pay.rest, amountCents == due, { amount = Money.plain(due, "en") })
                    FilterChip(strings.pay.half, false, { amount = Money.plain(due / 2, "en") })
                }
                Spacer(Modifier.height(12.dp))
                Eyebrow(strings.pay.tip, color = Route66.Muted)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(strings.pay.noTip, tip == 0, { tip = 0 })
                    FilterChip(strings.pay.roundUp, tip > 0 && tip == Money.roundUp(amountCents) - amountCents, { tip = Money.roundUp(amountCents) - amountCents })
                    FilterChip("+1 €", tip == 100, { tip = 100 })
                    FilterChip("10 %", false, { tip = amountCents / 10 })
                }
                Spacer(Modifier.height(12.dp))
                Eyebrow(strings.pay.method, color = Route66.Muted)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(strings.pay.cash, method == PayMethod.Cash, { method = PayMethod.Cash })
                    FilterChip(strings.pay.cardTerminal, method == PayMethod.CardTerminal, { method = PayMethod.CardTerminal })
                    if (readerReady && !request.roundOnly) FilterChip(strings.pay.tapToPay, method == PayMethod.TapToPay, { method = PayMethod.TapToPay })
                }
                if (method == PayMethod.Cash) {
                    Spacer(Modifier.height(10.dp))
                    val givenCents = Money.parse(given)
                    Text("${strings.pay.given}: ${givenCents?.let { Money.format(it, strings.code) } ?: "–"}", style = MaterialTheme.typography.titleMedium)
                    if (givenCents != null) Text(strings.pay.change(Money.format(Money.change(givenCents, amountCents + tip), strings.code)), color = Route66.Green, style = MaterialTheme.typography.titleLarge)
                }
            } }
        val keys: @Composable (Modifier) -> Unit = { modifier -> Column(modifier) {
                Keypad(onKey = { key -> if (method == PayMethod.Cash && (byDrinks || amountCents == due)) given = applyKey(given, key) else amount = applyKey(amount, key) })
                Spacer(Modifier.height(16.dp))
                PillButton(
                    strings.pay.confirm(Money.format(amountCents + tip, strings.code)),
                    {
                        if (request.roundOnly) vm.bookRound(method, tip, onDismiss)
                        else vm.pay(amountCents, tip, method, onDismiss, items = if (byDrinks) allocate(lines, picked) else null)
                    },
                    enabled = amountCents in 1..due && !state.busy,
                    big = true,
                    modifier = Modifier.fillMaxWidth(),
                    testTag = "pay-confirm",
                )
            } }
        if (compact) {
            details(Modifier.fillMaxWidth())
            Spacer(Modifier.height(16.dp))
            keys(Modifier.fillMaxWidth())
        } else Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            details(Modifier.weight(1f))
            keys(Modifier.width(300.dp))
        }
    }
}

/* The split-bill picker: every open drink with a stepper; tap the name to add one more. */
@Composable
private fun DrinkPicker(lines: List<DrinkLine>, picked: MutableMap<String, Int>) {
    val strings = LocalStrings.current
    Text(strings.pay.drinksHint, style = MaterialTheme.typography.bodyMedium, color = Route66.Muted)
    Spacer(Modifier.height(10.dp))
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        lines.forEach { line ->
            val count = picked[line.key] ?: 0
            Surface(
                onClick = { if (count < line.open) picked[line.key] = count + 1 },
                shape = RoundedCornerShape(16.dp),
                color = if (count > 0) Route66.Crimson.copy(alpha = 0.08f) else Color.White,
                border = androidx.compose.foundation.BorderStroke(if (count > 0) 2.dp else 1.dp, if (count > 0) Route66.Crimson else Route66.Ink.copy(alpha = 0.08f)),
                modifier = Modifier.fillMaxWidth().testTag("pick-${line.name}"),
            ) {
                Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(line.name, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${line.size.ifBlank { "" }}${if (line.size.isNotBlank()) " · " else ""}${Money.format(line.unitPriceCents, strings.code)} · ${line.open}× ${strings.tabs.balance.lowercase()}", style = MaterialTheme.typography.bodySmall, color = Route66.Muted)
                    }
                    Step(Icons.Rounded.Remove, enabled = count > 0) { if (count > 0) picked[line.key] = count - 1 }
                    Text("$count", fontFamily = com.paulanerroute66.deckel.ui.theme.GeistMono, fontSize = 18.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.width(36.dp).testTag("pick-count-${line.name}"), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    Step(Icons.Rounded.Add, enabled = count < line.open) { if (count < line.open) picked[line.key] = count + 1 }
                }
            }
        }
    }
    Spacer(Modifier.height(8.dp))
    val total = lines.sumOf { picked[it.key] ?: 0 }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(strings.pay.selected(total), style = MaterialTheme.typography.labelLarge, color = Route66.Muted, modifier = Modifier.weight(1f))
        FilterChip(strings.pay.clear, false, { picked.clear() })
        Spacer(Modifier.width(6.dp))
        FilterChip(strings.pay.all, false, { lines.forEach { picked[it.key] = it.open } })
    }
}

@Composable
private fun Step(icon: androidx.compose.ui.graphics.vector.ImageVector, enabled: Boolean, onClick: () -> Unit) {
    Surface(onClick = onClick, enabled = enabled, shape = CircleShape, color = Route66.Ink.copy(alpha = if (enabled) 0.07f else 0.03f), modifier = Modifier.size(36.dp)) {
        Box(contentAlignment = Alignment.Center) { Icon(icon, null, Modifier.size(18.dp), tint = Route66.Ink.copy(alpha = if (enabled) 1f else 0.3f)) }
    }
}
