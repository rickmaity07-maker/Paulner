package com.paulanerroute66.deckel.ui.tabs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import com.paulanerroute66.deckel.data.Money
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
import com.paulanerroute66.deckel.ui.components.MoneyText
import com.paulanerroute66.deckel.ui.components.PillButton
import com.paulanerroute66.deckel.ui.components.applyKey
import com.paulanerroute66.deckel.ui.theme.Route66

/*
  Take payment: amount (all, half, any part), tip, method. Cash shows the change
  to hand back; Tap to Pay hands over to the card reader and shows its progress.
  For a pay-as-you-go round the drinks are booked and paid in one go.
*/
@Composable
fun PaymentDialog(state: UiState, tab: Tab, request: PayRequest, vm: AppViewModel, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    val due = request.amountCents
    var amount by remember { mutableStateOf(Money.plain(due, "en")) }
    var tip by remember { mutableStateOf(0) }
    var method by remember { mutableStateOf(PayMethod.Cash) }
    var given by remember { mutableStateOf("") }
    val amountCents = Money.parse(amount) ?: 0
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
        Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            Column(Modifier.weight(1f)) {
                Eyebrow(strings.pay.due, color = Route66.Muted)
                MoneyText(due, fontSize = 30.sp, color = Route66.Crimson)
                Spacer(Modifier.height(12.dp))
                Eyebrow(strings.pay.amount, color = Route66.Muted)
                MoneyText(amountCents, fontSize = 40.sp)
                if (!request.roundOnly) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(strings.pay.rest, amountCents == due, { amount = Money.plain(due, "en") })
                    FilterChip(strings.pay.half, false, { amount = Money.plain(due / 2, "en") })
                }
                Spacer(Modifier.height(12.dp))
                Eyebrow(strings.pay.tip, color = Route66.Muted)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(strings.pay.noTip, tip == 0, { tip = 0 })
                    FilterChip(strings.pay.roundUp, tip > 0 && tip == Money.roundUp(amountCents) - amountCents, { tip = Money.roundUp(amountCents) - amountCents })
                    FilterChip("+1 €", tip == 100, { tip = 100 })
                    FilterChip("10 %", false, { tip = amountCents / 10 })
                }
                Spacer(Modifier.height(12.dp))
                Eyebrow(strings.pay.method, color = Route66.Muted)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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
            }
            Column(Modifier.width(300.dp)) {
                Keypad(onKey = { key -> if (method == PayMethod.Cash && amountCents == due) given = applyKey(given, key) else amount = applyKey(amount, key) })
                Spacer(Modifier.height(16.dp))
                PillButton(
                    strings.pay.confirm(Money.format(amountCents + tip, strings.code)),
                    {
                        if (request.roundOnly) vm.bookRound(method, tip, onDismiss) else vm.pay(amountCents, tip, method, onDismiss)
                    },
                    enabled = amountCents in 1..due && !state.busy,
                    big = true,
                    modifier = Modifier.fillMaxWidth(),
                    testTag = "pay-confirm",
                )
            }
        }
    }
}
