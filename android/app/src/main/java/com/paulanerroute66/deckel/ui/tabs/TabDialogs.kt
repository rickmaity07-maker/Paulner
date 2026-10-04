package com.paulanerroute66.deckel.ui.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.paulanerroute66.deckel.data.Customer
import com.paulanerroute66.deckel.data.Tab
import com.paulanerroute66.deckel.data.TabItem
import com.paulanerroute66.deckel.data.TabMode
import com.paulanerroute66.deckel.data.Times
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.AppViewModel
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.Avatar
import com.paulanerroute66.deckel.ui.components.ButtonKind
import com.paulanerroute66.deckel.ui.components.Divider
import com.paulanerroute66.deckel.ui.components.Eyebrow
import com.paulanerroute66.deckel.ui.components.LocalCompact
import com.paulanerroute66.deckel.ui.components.MoneyText
import com.paulanerroute66.deckel.ui.components.PillButton
import com.paulanerroute66.deckel.ui.components.Segmented
import com.paulanerroute66.deckel.ui.theme.GeistMono
import com.paulanerroute66.deckel.ui.theme.Route66

/* A cream card on a dimmed screen, used by every dialog in the app. */
@Composable
fun DialogFrame(title: String, onDismiss: () -> Unit, width: Dp = 560.dp, testTag: String = "dialog", content: @Composable ColumnScope.() -> Unit) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        // On a phone the card takes the full width and scrolls when the keyboard or keypad needs the room.
        val compact = LocalCompact.current
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = Route66.Cream,
            modifier = Modifier.padding(horizontal = if (compact) 10.dp else 0.dp).widthIn(max = width).fillMaxWidth().testTag(testTag),
        ) {
            Column(Modifier.verticalScroll(rememberScrollState()).padding(if (compact) 20.dp else 28.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(title, style = if (compact) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.headlineLarge, color = Route66.Ink, modifier = Modifier.weight(1f))
                    IconButton(onClick = onDismiss, modifier = Modifier.testTag("$testTag-close")) { Icon(Icons.Rounded.Close, contentDescription = null) }
                }
                Spacer(Modifier.height(18.dp))
                content()
            }
        }
    }
}

@Composable
fun field(): androidx.compose.material3.TextFieldColors = OutlinedTextFieldDefaults.colors(
    unfocusedContainerColor = Color.White,
    focusedContainerColor = Color.White,
    unfocusedBorderColor = Route66.Ink.copy(alpha = 0.12f),
    focusedBorderColor = Route66.Blue,
)

@Composable
fun ConfirmDialog(title: String, confirmLabel: String, danger: Boolean, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    DialogFrame(title, onDismiss, width = 520.dp, testTag = "confirm") {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PillButton(strings.common.cancel, onDismiss, kind = ButtonKind.Secondary, modifier = Modifier.weight(1f))
            PillButton(confirmLabel, onConfirm, kind = if (danger) ButtonKind.Danger else ButtonKind.Primary, modifier = Modifier.weight(1f), testTag = "confirm-ok")
        }
    }
}

/* New tab: for a guest from the guest list (or a brand-new one), or a walk-in with just a name. */
@Composable
fun NewTabDialog(state: UiState, vm: AppViewModel, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var forGuest by remember { mutableStateOf(false) }
    var label by remember { mutableStateOf("") }
    var table by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf(TabMode.PayLater) }
    var query by remember { mutableStateOf("") }
    var guest by remember { mutableStateOf<Customer?>(null) }
    LaunchedEffect(forGuest, query) { if (forGuest) vm.searchGuests(query) }

    DialogFrame(strings.tabs.newTabTitle, onDismiss, width = 640.dp, testTag = "new-tab-dialog") {
        Segmented(listOf(false to strings.tabs.forWalkIn, true to strings.tabs.forGuest), forGuest, { forGuest = it; guest = null }, testTagPrefix = "newtab-kind")
        Spacer(Modifier.height(18.dp))
        if (forGuest) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it; guest = null },
                placeholder = { Text(strings.tabs.searchGuest) },
                leadingIcon = { Icon(Icons.Rounded.Search, null) },
                singleLine = true,
                colors = field(),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth().testTag("newtab-guest-search"),
            )
            Spacer(Modifier.height(10.dp))
            LazyColumn(Modifier.heightIn(max = 260.dp)) {
                items(state.guests, key = { it.id }) { c ->
                    GuestRow(c, selected = guest?.id == c.id) { guest = c }
                }
                item {
                    if (query.isNotBlank() && state.guests.none { it.name.equals(query.trim(), true) }) {
                        Row(
                            Modifier.fillMaxWidth().clickable {
                                vm.saveGuest(null, query, "", "", "", false, null) { saved -> guest = saved }
                            }.padding(vertical = 12.dp).testTag("newtab-create-guest"),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Rounded.PersonAdd, null, tint = Route66.Blue)
                            Spacer(Modifier.width(10.dp))
                            Text("${strings.tabs.createGuest}: „${query.trim()}“", color = Route66.Blue, style = MaterialTheme.typography.titleSmall)
                        }
                    }
                }
            }
        } else {
            OutlinedTextField(
                value = label,
                onValueChange = { label = it },
                label = { Text(strings.tabs.walkInLabel) },
                supportingText = { Text(strings.tabs.tableHint) },
                singleLine = true,
                colors = field(),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth().testTag("newtab-label"),
            )
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = table,
            onValueChange = { table = it.take(20) },
            label = { Text(strings.tabs.table) },
            singleLine = true,
            colors = field(),
            shape = RoundedCornerShape(18.dp),
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
            modifier = Modifier.width(220.dp).testTag("newtab-table"),
        )
        Spacer(Modifier.height(16.dp))
        Eyebrow(strings.tabs.modeTitle, color = Route66.Muted)
        Spacer(Modifier.height(8.dp))
        Segmented(listOf(TabMode.PayLater to strings.tabs.payLater, TabMode.PayAsYouGo to strings.tabs.payAsYouGo), mode, { mode = it }, testTagPrefix = "newtab-mode")
        Spacer(Modifier.height(6.dp))
        Text(if (mode == TabMode.PayLater) strings.tabs.payLaterHint else strings.tabs.payAsYouGoHint, style = MaterialTheme.typography.bodySmall, color = Route66.Muted)
        Spacer(Modifier.height(22.dp))
        val openTabOfGuest = guest?.openTabId
        if (openTabOfGuest != null) {
            Text("${guest?.name} ${strings.tabs.alreadyOpen}", color = Route66.Crimson, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(10.dp))
            PillButton(strings.tabs.goToTab, { vm.selectTab(openTabOfGuest); onDismiss() }, kind = ButtonKind.Blue, modifier = Modifier.fillMaxWidth(), big = true)
        } else {
            PillButton(
                strings.tabs.openTab,
                {
                    if (forGuest) guest?.let { vm.openTab(it.name, table, mode, it.id) } else vm.openTab(label, table, mode, null)
                    onDismiss()
                },
                enabled = if (forGuest) guest != null else label.isNotBlank() || table.isNotBlank(),
                big = true,
                modifier = Modifier.fillMaxWidth(),
                testTag = "newtab-open",
            )
        }
    }
}

@Composable
fun GuestRow(c: Customer, selected: Boolean, onClick: () -> Unit) {
    val strings = LocalStrings.current
    Row(
        Modifier.fillMaxWidth().background(if (selected) Route66.Blue.copy(alpha = 0.12f) else Color.Transparent, RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(10.dp).testTag("guest-row-${c.name}"),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(c.name, size = 36.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(c.name, style = MaterialTheme.typography.titleSmall)
                if (c.regular) Icon(Icons.Rounded.Star, null, Modifier.padding(start = 4.dp).size(14.dp), tint = Route66.Gold)
            }
            Text(listOfNotNull(c.phone.takeIf { it.isNotBlank() }, c.openTabId?.let { strings.tabs.alreadyOpen }).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Route66.Muted)
        }
        if (c.balanceCents > 0) MoneyText(c.balanceCents, fontSize = 14.sp, color = Route66.Crimson)
    }
    Divider()
}

@Composable
fun EditTabDialog(tab: Tab, vm: AppViewModel, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var label by remember { mutableStateOf(tab.label) }
    var table by remember { mutableStateOf(tab.table) }
    var note by remember { mutableStateOf(tab.note) }
    DialogFrame(strings.tabs.rename, onDismiss, testTag = "edit-tab") {
        OutlinedTextField(label, { label = it }, label = { Text(strings.tabs.label) }, singleLine = true, colors = field(), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth().testTag("edit-label"))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(table, { table = it.take(20) }, label = { Text(strings.tabs.table) }, singleLine = true, colors = field(), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth().testTag("edit-table"))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(note, { note = it.take(200) }, label = { Text(strings.tabs.note) }, colors = field(), shape = RoundedCornerShape(18.dp), minLines = 2, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(20.dp))
        PillButton(strings.common.save, { vm.updateTab(label = label, table = table, note = note); onDismiss() }, enabled = label.isNotBlank(), big = true, modifier = Modifier.fillMaxWidth(), testTag = "edit-save")
    }
}

@Composable
fun LinkGuestDialog(state: UiState, vm: AppViewModel, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var query by remember { mutableStateOf("") }
    LaunchedEffect(query) { vm.searchGuests(query) }
    DialogFrame(strings.tabs.linkGuest, onDismiss, testTag = "link-guest") {
        OutlinedTextField(query, { query = it }, placeholder = { Text(strings.tabs.searchGuest) }, leadingIcon = { Icon(Icons.Rounded.Search, null) }, singleLine = true, colors = field(), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(10.dp))
        LazyColumn(Modifier.heightIn(max = 320.dp)) {
            items(state.guests.filter { it.openTabId == null || it.openTabId == state.selectedTabId }, key = { it.id }) { c ->
                GuestRow(c, selected = state.selectedTab?.customer?.id == c.id) { vm.linkGuest(c.id); onDismiss() }
            }
        }
        if (state.selectedTab?.customer != null) {
            Spacer(Modifier.height(12.dp))
            PillButton(strings.tabs.unlinkGuest, { vm.linkGuest(null); onDismiss() }, kind = ButtonKind.Danger, modifier = Modifier.fillMaxWidth())
        }
    }
}

/* Tap a drink on the tab: change the quantity, void it with a reason, or (owners) put it on the house. */
@Composable
fun ItemDialog(state: UiState, item: TabItem, vm: AppViewModel, onDismiss: () -> Unit) {
    val strings = LocalStrings.current
    var qty by remember { mutableIntStateOf(item.qty) }
    var reason by remember { mutableStateOf(strings.item.reasons.first()) }
    DialogFrame(item.name, onDismiss, testTag = "item-dialog") {
        Text(strings.item.addedAt(Times.clock(item.addedAt), item.addedBy), color = Route66.Muted, style = MaterialTheme.typography.bodyMedium)
        if (item.voided) {
            Spacer(Modifier.height(10.dp))
            Text("${strings.tabs.voided}: ${item.voidReason}", color = Route66.Crimson)
            return@DialogFrame
        }
        Spacer(Modifier.height(18.dp))
        Eyebrow(strings.item.qty, color = Route66.Muted)
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            QtyButton(Icons.Rounded.Remove, enabled = qty > 1) { qty-- }
            Text("$qty", fontFamily = GeistMono, fontSize = 30.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(80.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            QtyButton(Icons.Rounded.Add, enabled = qty < 99) { qty++ }
            Spacer(Modifier.weight(1f))
            MoneyText(item.unitPriceCents * qty, fontSize = 24.sp)
        }
        if (qty != item.qty) {
            Spacer(Modifier.height(12.dp))
            PillButton(strings.item.save, { vm.setQty(item.id, qty); onDismiss() }, modifier = Modifier.fillMaxWidth(), testTag = "item-qty-save")
        }
        Spacer(Modifier.height(22.dp))
        Eyebrow(strings.item.voidTitle, color = Route66.Muted)
        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            strings.item.reasons.forEach { r ->
                Surface(
                    onClick = { reason = r },
                    shape = CircleShape,
                    color = if (reason == r) Route66.Asphalt else Color.White,
                    contentColor = if (reason == r) Route66.Chrome else Route66.Ink,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Route66.Ink.copy(alpha = 0.12f)),
                ) { Text(r, Modifier.padding(horizontal = 14.dp, vertical = 8.dp), style = MaterialTheme.typography.labelLarge) }
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PillButton(strings.item.voidAction, { vm.voidItem(item.id, reason); onDismiss() }, kind = ButtonKind.Danger, modifier = Modifier.weight(1f), testTag = "item-void")
            if (state.isOwner) {
                PillButton(
                    if (item.onHouse) strings.item.charge else strings.item.onHouse,
                    { vm.setOnHouse(item.id, !item.onHouse); onDismiss() },
                    kind = ButtonKind.Blue,
                    icon = Icons.Rounded.Star,
                    modifier = Modifier.weight(1f),
                    testTag = "item-on-house",
                )
            }
        }
    }
}

@Composable
private fun QtyButton(icon: androidx.compose.ui.graphics.vector.ImageVector, enabled: Boolean, onClick: () -> Unit) {
    Surface(onClick = onClick, enabled = enabled, shape = CircleShape, color = Color.White, border = androidx.compose.foundation.BorderStroke(1.dp, Route66.Ink.copy(alpha = 0.12f)), modifier = Modifier.size(52.dp)) {
        Box(contentAlignment = Alignment.Center) { Icon(icon, null, tint = if (enabled) Route66.Ink else Route66.Muted.copy(alpha = 0.4f)) }
    }
}
