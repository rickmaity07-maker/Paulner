package com.paulanerroute66.deckel.ui.guests

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.LocalBar
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paulanerroute66.deckel.data.Customer
import com.paulanerroute66.deckel.data.Money
import com.paulanerroute66.deckel.data.PayMethod
import com.paulanerroute66.deckel.data.TabStatus
import com.paulanerroute66.deckel.data.Times
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.AppViewModel
import com.paulanerroute66.deckel.ui.GuestFilter
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.Avatar
import com.paulanerroute66.deckel.ui.components.Badge
import com.paulanerroute66.deckel.ui.components.ButtonKind
import com.paulanerroute66.deckel.ui.components.Card
import com.paulanerroute66.deckel.ui.components.Divider
import com.paulanerroute66.deckel.ui.components.EmptyState
import com.paulanerroute66.deckel.ui.components.Eyebrow
import com.paulanerroute66.deckel.ui.components.FilterChip
import com.paulanerroute66.deckel.ui.components.Keypad
import com.paulanerroute66.deckel.ui.components.MoneyText
import com.paulanerroute66.deckel.ui.components.PillButton
import com.paulanerroute66.deckel.ui.components.SectionTitle
import com.paulanerroute66.deckel.ui.components.Stat
import com.paulanerroute66.deckel.ui.components.applyKey
import com.paulanerroute66.deckel.ui.tabs.DialogFrame
import com.paulanerroute66.deckel.ui.tabs.GuestRow
import com.paulanerroute66.deckel.ui.tabs.field
import com.paulanerroute66.deckel.ui.theme.Route66

/* Guest CRM: who comes, what they drink, what they owe. List on the left, profile on the right. */
@Composable
fun GuestsScreen(state: UiState, vm: AppViewModel) {
    val strings = LocalStrings.current
    var editing by remember { mutableStateOf<Customer?>(null) }
    var creating by remember { mutableStateOf(false) }
    var settling by remember { mutableStateOf<Customer?>(null) }
    LaunchedEffect(Unit) { vm.searchGuests(state.guestQuery) }

    Row(Modifier.fillMaxSize()) {
        Column(Modifier.weight(0.36f).fillMaxHeight().background(Route66.Paper.copy(alpha = 0.5f)).padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(strings.guests.title, style = MaterialTheme.typography.displaySmall, modifier = Modifier.weight(1f))
                PillButton(strings.guests.newGuest, { creating = true }, icon = Icons.Rounded.PersonAdd, testTag = "guest-new")
            }
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                state.guestQuery, vm::searchGuests, placeholder = { Text(strings.guests.search) }, leadingIcon = { Icon(Icons.Rounded.Search, null) },
                singleLine = true, shape = CircleShape, colors = field(), modifier = Modifier.fillMaxWidth().testTag("guest-search"),
            )
            Spacer(Modifier.height(10.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(strings.guests.all, state.guestFilter == GuestFilter.All, { vm.setGuestFilter(GuestFilter.All) }, count = state.guests.size)
                FilterChip(strings.guests.regulars, state.guestFilter == GuestFilter.Regulars, { vm.setGuestFilter(GuestFilter.Regulars) }, count = state.guests.count { it.regular })
                FilterChip(strings.guests.owing, state.guestFilter == GuestFilter.Owing, { vm.setGuestFilter(GuestFilter.Owing) }, count = state.guests.count { it.balanceCents > 0 })
            }
            Spacer(Modifier.height(10.dp))
            if (state.visibleGuests.isEmpty()) EmptyState(strings.guests.empty, "", showShield = false)
            else LazyColumn(Modifier.testTag("guest-list")) {
                items(state.visibleGuests, key = { it.id }) { c -> GuestRow(c, c.id == state.selectedGuest?.id) { vm.selectGuest(c.id) } }
            }
        }
        Box(Modifier.width(1.dp).fillMaxHeight().background(Route66.Ink.copy(alpha = 0.08f)))
        val guest = state.selectedGuest
        Box(Modifier.weight(0.64f).fillMaxHeight()) {
            if (guest == null) EmptyState(strings.guests.pick, "")
            else GuestProfile(state, guest, vm, onEdit = { editing = guest }, onSettle = { settling = guest })
        }
    }

    if (creating) GuestForm(null, state.isOwner, vm) { creating = false }
    editing?.let { g -> GuestForm(g, state.isOwner, vm) { editing = null } }
    settling?.let { g -> SettleDialog(g, vm) { settling = null } }
}

@Composable
private fun GuestProfile(state: UiState, guest: Customer, vm: AppViewModel, onEdit: () -> Unit, onSettle: () -> Unit) {
    val strings = LocalStrings.current
    val money = { c: Int -> Money.format(c, strings.code) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Avatar(guest.name, size = 72.dp)
            Spacer(Modifier.width(18.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(guest.name, style = MaterialTheme.typography.displaySmall, modifier = Modifier.testTag("guest-name"))
                    if (guest.regular) { Spacer(Modifier.width(10.dp)); Badge(strings.guests.regular, Route66.Gold, onColor = Route66.Asphalt) }
                }
                Text(listOf(guest.phone, guest.email).filter { it.isNotBlank() }.joinToString(" · "), color = Route66.Muted)
                if (guest.note.isNotBlank()) Text("„${guest.note}“", color = Route66.Blue, style = MaterialTheme.typography.bodyMedium)
            }
            PillButton(strings.guests.editGuest, onEdit, kind = ButtonKind.Secondary, icon = Icons.Rounded.Edit, testTag = "guest-edit")
        }
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Stat(strings.guests.balance, money(guest.balanceCents), Modifier.weight(1f), accent = if (guest.balanceCents > 0) Route66.Crimson else Route66.Green,
                sub = if (guest.creditLimitCents > 0) "${strings.guests.creditLimit.substringBefore(" (")}: ${money(guest.creditLimitCents)}" else null)
            Stat(strings.guests.spent, money(guest.totalSpentCents), Modifier.weight(1f))
            Stat(strings.guests.visits, "${guest.visits}", Modifier.weight(1f))
            Stat(strings.guests.lastVisit, guest.lastVisitAt?.let { Times.date(it, strings.code) } ?: strings.guests.never, Modifier.weight(1f))
        }
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PillButton(if (guest.openTabId != null) strings.guests.goToTab else strings.guests.openTab, { vm.openTabForGuest(guest) }, icon = Icons.Rounded.LocalBar, big = true, modifier = Modifier.weight(1f), testTag = "guest-open-tab")
            PillButton(strings.guests.settle, onSettle, kind = ButtonKind.Blue, icon = Icons.Rounded.Payments, enabled = guest.balanceCents > 0, big = true, modifier = Modifier.weight(1f), testTag = "guest-settle")
        }
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Card(Modifier.weight(1f)) {
                Column {
                    SectionTitle(strings.guests.favourites)
                    Spacer(Modifier.height(10.dp))
                    if (guest.favourites.isEmpty()) Text(strings.guests.noFavourites, color = Route66.Muted)
                    guest.favourites.forEach { f ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Star, null, Modifier.size(16.dp), tint = Route66.Gold)
                            Spacer(Modifier.width(8.dp))
                            Text("${f.name} ${f.size}", modifier = Modifier.weight(1f))
                            Text("${f.qty}×", color = Route66.Muted)
                        }
                    }
                }
            }
            Card(Modifier.weight(1.4f)) {
                Column {
                    SectionTitle(strings.guests.tabsHistory)
                    Spacer(Modifier.height(10.dp))
                    guest.tabs.take(15).forEach { t ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(Times.date(t.openedAt, strings.code), modifier = Modifier.width(110.dp))
                            Text(
                                when (t.status) {
                                    TabStatus.Open -> strings.tabs.open
                                    TabStatus.Closed -> strings.tabs.closed
                                    TabStatus.OnAccount -> strings.tabs.onAccount
                                    TabStatus.Void -> strings.tabs.voidStatus
                                },
                                color = if (t.status == TabStatus.OnAccount) Route66.Crimson else Route66.Muted, modifier = Modifier.weight(1f),
                            )
                            MoneyText(t.totalCents, fontSize = 15.sp)
                        }
                        Divider()
                    }
                }
            }
        }
        if (guest.balanceCents == 0 && guest.openTabId == null) {
            Spacer(Modifier.height(16.dp))
            Text(strings.guests.archive, color = Route66.Crimson, style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.clickable { vm.archiveGuest(guest.id) }.padding(8.dp).testTag("guest-archive"))
        }
    }
}

@Composable
private fun GuestForm(guest: Customer?, owner: Boolean, vm: AppViewModel, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var name by remember { mutableStateOf(guest?.name ?: "") }
    var phone by remember { mutableStateOf(guest?.phone ?: "") }
    var email by remember { mutableStateOf(guest?.email ?: "") }
    var note by remember { mutableStateOf(guest?.note ?: "") }
    var regular by remember { mutableStateOf(guest?.regular ?: false) }
    var limit by remember { mutableStateOf(guest?.creditLimitCents?.let { Money.plain(it, "en") } ?: "0") }
    DialogFrame(if (guest == null) strings.guests.newGuest else strings.guests.editGuest, onDismiss, testTag = "guest-form") {
        OutlinedTextField(name, { name = it }, label = { Text(strings.guests.name) }, singleLine = true, colors = field(), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth().testTag("guest-form-name"))
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(phone, { phone = it }, label = { Text(strings.guests.phone) }, singleLine = true, colors = field(), shape = RoundedCornerShape(18.dp), modifier = Modifier.weight(1f).testTag("guest-form-phone"))
            OutlinedTextField(email, { email = it }, label = { Text(strings.guests.email) }, singleLine = true, colors = field(), shape = RoundedCornerShape(18.dp), modifier = Modifier.weight(1f))
        }
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(note, { note = it }, label = { Text(strings.guests.note) }, colors = field(), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth().testTag("guest-form-note"))
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(regular, { regular = it }, modifier = Modifier.testTag("guest-form-regular"))
            Text(strings.guests.regular)
            Spacer(Modifier.width(24.dp))
            OutlinedTextField(limit, { limit = it }, enabled = owner, label = { Text(strings.guests.creditLimit) }, supportingText = { Text(strings.guests.creditHint) }, singleLine = true, colors = field(), shape = RoundedCornerShape(18.dp), modifier = Modifier.weight(1f))
        }
        Spacer(Modifier.height(16.dp))
        PillButton(strings.guests.save, {
            vm.saveGuest(guest?.id, name, phone, email, note, regular, if (owner) Money.parse(limit) ?: 0 else null) { onDismiss() }
        }, enabled = name.isNotBlank(), big = true, modifier = Modifier.fillMaxWidth(), testTag = "guest-form-save")
    }
}

@Composable
private fun SettleDialog(guest: Customer, vm: AppViewModel, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var amount by remember { mutableStateOf(Money.plain(guest.balanceCents, "en")) }
    var method by remember { mutableStateOf(PayMethod.Cash) }
    val cents = Money.parse(amount) ?: 0
    DialogFrame(strings.pay.settleTitle, onDismiss, width = 640.dp, testTag = "settle-dialog") {
        Text(strings.pay.settleHint(Money.format(guest.balanceCents, strings.code)), color = Route66.Muted)
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Column(Modifier.weight(1f)) {
                Eyebrow(strings.pay.amount, color = Route66.Muted)
                MoneyText(cents, fontSize = 38.sp)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(strings.pay.cash, method == PayMethod.Cash, { method = PayMethod.Cash })
                    FilterChip(strings.pay.cardTerminal, method == PayMethod.CardTerminal, { method = PayMethod.CardTerminal })
                }
            }
            Keypad(onKey = { amount = applyKey(amount, it) }, modifier = Modifier.width(260.dp))
        }
        Spacer(Modifier.height(16.dp))
        PillButton(strings.pay.confirm(Money.format(cents, strings.code)), { vm.settleGuest(guest.id, cents, method, onDismiss) },
            enabled = cents in 1..guest.balanceCents, big = true, modifier = Modifier.fillMaxWidth(), testTag = "settle-confirm")
    }
}
