package com.paulanerroute66.deckel.ui.tabs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.LockOpen
import androidx.compose.material.icons.rounded.MenuBook
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Replay
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.TableRestaurant
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paulanerroute66.deckel.data.Category
import com.paulanerroute66.deckel.data.Drink
import com.paulanerroute66.deckel.data.Money
import com.paulanerroute66.deckel.data.PayMethod
import com.paulanerroute66.deckel.data.Tab
import com.paulanerroute66.deckel.data.TabItem
import com.paulanerroute66.deckel.data.TabMode
import com.paulanerroute66.deckel.data.TabStatus
import com.paulanerroute66.deckel.data.Times
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.AppViewModel
import com.paulanerroute66.deckel.ui.TabFilter
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.Avatar
import com.paulanerroute66.deckel.ui.components.BackBar
import com.paulanerroute66.deckel.ui.components.Badge
import com.paulanerroute66.deckel.ui.components.ButtonKind
import com.paulanerroute66.deckel.ui.components.DashedDivider
import com.paulanerroute66.deckel.ui.components.Divider
import com.paulanerroute66.deckel.ui.components.EmptyState
import com.paulanerroute66.deckel.ui.components.Eyebrow
import com.paulanerroute66.deckel.ui.components.FilterChip
import com.paulanerroute66.deckel.ui.components.LocalCompact
import com.paulanerroute66.deckel.ui.components.MoneyText
import com.paulanerroute66.deckel.ui.components.PillButton
import com.paulanerroute66.deckel.ui.components.Segmented
import com.paulanerroute66.deckel.ui.theme.GeistMono
import com.paulanerroute66.deckel.ui.theme.Route66
import com.paulanerroute66.deckel.ui.theme.Rye

/*
  The bar's main screen, three panes side by side on a landscape tablet:
    open tabs  |  the selected tab (round, items, totals, actions)  |  the drinks menu as big tiles
*/
@Composable
fun TabsScreen(state: UiState, vm: AppViewModel) {
    var showNew by remember { mutableStateOf(false) }
    var showPay by remember { mutableStateOf<PayRequest?>(null) }
    var itemDialog by remember { mutableStateOf<TabItem?>(null) }
    var showEdit by remember { mutableStateOf(false) }
    var showLink by remember { mutableStateOf(false) }
    var confirm by remember { mutableStateOf<ConfirmRequest?>(null) }
    val strings = LocalStrings.current
    val tab = state.selectedTab

    val detail: @Composable (Modifier) -> Unit = { modifier ->
        if (tab != null) TabDetail(
            state = state,
            tab = tab,
            vm = vm,
            onPay = { amount -> showPay = PayRequest(amount, roundOnly = false) },
            onBookAndPay = { showPay = PayRequest(state.roundCents, roundOnly = true) },
            onItem = { itemDialog = it },
            onEdit = { showEdit = true },
            onLink = { showLink = true },
            onConfirm = { confirm = it },
            modifier = modifier,
        )
    }

    if (LocalCompact.current) {
        // Phone: the list, or one tab full-screen with its bill and the menu one switch apart.
        if (tab == null) TabList(state, vm, onNew = { showNew = true }, modifier = Modifier.fillMaxSize())
        else Column(Modifier.fillMaxSize()) {
            // Opens on the menu: adding drinks is what happens most; the bill is one tap away.
            var page by remember(tab.id) { mutableStateOf(TabPage.Menu) }
            BackBar({ vm.selectTab(null) }) {
                val roundCount = state.round.sumOf { it.qty }
                Segmented(
                    listOf(TabPage.Bill to strings.tabs.bill, TabPage.Menu to if (roundCount > 0) "${strings.tabs.categories} · $roundCount" else strings.tabs.categories),
                    page, { page = it }, Modifier.weight(1f), testTagPrefix = "page",
                )
            }
            when (page) {
                TabPage.Bill -> detail(Modifier.weight(1f))
                TabPage.Menu -> {
                    DrinkGrid(state.menu?.categories.orEmpty(), state.round.associate { it.drink.id to it.qty }, vm::addToRound, Modifier.weight(1f))
                    AnimatedVisibility(state.round.isNotEmpty(), enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                        Box(Modifier.padding(horizontal = 12.dp).heightIn(max = 300.dp).verticalScroll(rememberScrollState())) {
                            RoundPanel(state, vm, tab) { showPay = PayRequest(state.roundCents, roundOnly = true) }
                        }
                    }
                }
            }
        }
    } else Row(Modifier.fillMaxSize()) {
        TabList(state, vm, onNew = { showNew = true }, modifier = Modifier.weight(0.27f).fillMaxHeight())
        Box(Modifier.width(1.dp).fillMaxHeight().background(Route66.Ink.copy(alpha = 0.08f)))
        if (tab == null) {
            Box(Modifier.weight(0.73f).fillMaxHeight()) { EmptyState(strings.tabs.pickOne, strings.tabs.pickHint) }
        } else {
            detail(Modifier.weight(0.36f).fillMaxHeight())
            Box(Modifier.width(1.dp).fillMaxHeight().background(Route66.Ink.copy(alpha = 0.08f)))
            DrinkGrid(state.menu?.categories.orEmpty(), state.round.associate { it.drink.id to it.qty }, vm::addToRound, Modifier.weight(0.37f).fillMaxHeight())
        }
    }

    if (showNew) NewTabDialog(state, vm, onDismiss = { showNew = false })
    showPay?.let { request ->
        if (tab != null) PaymentDialog(state, tab, request, vm, onDismiss = { showPay = null })
    }
    itemDialog?.let { item -> ItemDialog(state, item, vm, onDismiss = { itemDialog = null }) }
    if (showEdit && tab != null) EditTabDialog(tab, vm, onDismiss = { showEdit = false })
    if (showLink && tab != null) LinkGuestDialog(state, vm, onDismiss = { showLink = false })
    confirm?.let { c -> ConfirmDialog(c.title, c.confirmLabel, c.danger, onConfirm = { c.action(); confirm = null }, onDismiss = { confirm = null }) }
}

private enum class TabPage { Bill, Menu }

data class PayRequest(val amountCents: Int, val roundOnly: Boolean)
data class ConfirmRequest(val title: String, val confirmLabel: String, val danger: Boolean = false, val action: () -> Unit)

/* ---------- Left: open tabs ---------- */

@Composable
private fun TabList(state: UiState, vm: AppViewModel, onNew: () -> Unit, modifier: Modifier) {
    val strings = LocalStrings.current
    Column(modifier.background(Route66.Paper.copy(alpha = 0.5f)).padding(if (LocalCompact.current) 14.dp else 18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Eyebrow(strings.tabs.open)
                // The count, with today's date beside it, e.g. "3  Mo. 5. Okt."
                val today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("EEE d. MMM", java.util.Locale.forLanguageTag(strings.code)))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${state.openTabs.size}", fontFamily = Rye, fontSize = 34.sp, color = Route66.Ink)
                    Spacer(Modifier.width(10.dp))
                    Text(today, style = MaterialTheme.typography.bodyMedium, color = Route66.Muted, maxLines = 1)
                }
            }
            PillButton(strings.tabs.newTab, onNew, icon = Icons.Rounded.Add, testTag = "new-tab")
        }
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(
            value = state.tabQuery,
            onValueChange = vm::setTabQuery,
            placeholder = { Text(strings.tabs.search) },
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
            singleLine = true,
            shape = CircleShape,
            colors = OutlinedTextFieldDefaults.colors(unfocusedContainerColor = Color.White, focusedContainerColor = Color.White, unfocusedBorderColor = Route66.Ink.copy(alpha = 0.1f)),
            modifier = Modifier.fillMaxWidth().testTag("tab-search"),
        )
        Spacer(Modifier.height(10.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(strings.tabs.all, state.tabFilter == TabFilter.All, { vm.setTabFilter(TabFilter.All) }, count = state.openTabs.size)
            FilterChip(strings.tabs.withGuest, state.tabFilter == TabFilter.Guests, { vm.setTabFilter(TabFilter.Guests) }, count = state.openTabs.count { it.customer != null })
            FilterChip(strings.tabs.walkIn, state.tabFilter == TabFilter.WalkIns, { vm.setTabFilter(TabFilter.WalkIns) }, count = state.openTabs.count { it.customer == null })
        }
        Spacer(Modifier.height(12.dp))
        val tabs = state.visibleTabs
        if (state.tabsLoaded && tabs.isEmpty()) {
            EmptyState(strings.tabs.empty, strings.tabs.emptyHint, showShield = false)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 24.dp), modifier = Modifier.testTag("tab-list")) {
                items(tabs, key = { it.id }) { tab -> TabCard(tab, tab.id == state.selectedTabId) { vm.selectTab(tab.id) } }
            }
        }
    }
}

@Composable
private fun TabCard(tab: Tab, selected: Boolean, onClick: () -> Unit) {
    val strings = LocalStrings.current
    val minutes = Times.minutesSince(tab.openedAt)
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (selected) Route66.Asphalt else Color.White,
        contentColor = if (selected) Route66.Chrome else Route66.Ink,
        border = if (selected) null else androidx.compose.foundation.BorderStroke(1.dp, Route66.Ink.copy(alpha = 0.07f)),
        shadowElevation = if (selected) 6.dp else 0.dp,
        modifier = Modifier.fillMaxWidth().animateContentSize().testTag("tab-card-${tab.label}"),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (tab.customer != null) Avatar(tab.customer.name, size = 34.dp) else Box(
                    Modifier.size(34.dp).clip(CircleShape).background(if (selected) Route66.Chrome.copy(alpha = 0.15f) else Route66.Paper),
                    contentAlignment = Alignment.Center,
                ) {
                    if (tab.table.isNotBlank() && tab.table.length <= 4) Text(tab.table, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    else Text("#${tab.number}", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(tab.label, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (tab.table.isNotBlank()) {
                            Icon(Icons.Rounded.TableRestaurant, null, Modifier.size(13.dp), tint = LocalContentColorAlpha(selected))
                            Spacer(Modifier.width(3.dp))
                            Text(tab.table, style = MaterialTheme.typography.bodySmall, color = LocalContentColorAlpha(selected))
                            Spacer(Modifier.width(8.dp))
                        }
                        Icon(Icons.Rounded.Timer, null, Modifier.size(13.dp), tint = if (minutes > 180) Route66.Gold else LocalContentColorAlpha(selected))
                        Spacer(Modifier.width(3.dp))
                        Text(strings.tabs.since(Times.clock(tab.openedAt)), style = MaterialTheme.typography.bodySmall, color = LocalContentColorAlpha(selected))
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    MoneyText(tab.balanceCents, fontSize = 18.sp, color = if (selected) Route66.Chrome else if (tab.balanceCents > 0) Route66.Crimson else Route66.Green, weight = FontWeight.SemiBold)
                    Text(strings.tabs.drinksCount(tab.itemCount), style = MaterialTheme.typography.bodySmall, color = LocalContentColorAlpha(selected))
                }
            }
            if (tab.mode == TabMode.PayAsYouGo) {
                Spacer(Modifier.height(8.dp))
                Badge(strings.tabs.payAsYouGo, Route66.Blue)
            }
        }
    }
}

@Composable
private fun LocalContentColorAlpha(selected: Boolean) = if (selected) Route66.Chrome.copy(alpha = 0.6f) else Route66.Muted

/* ---------- Middle: the tab ---------- */

@Composable
private fun TabDetail(
    state: UiState,
    tab: Tab,
    vm: AppViewModel,
    onPay: (Int) -> Unit,
    onBookAndPay: () -> Unit,
    onItem: (TabItem) -> Unit,
    onEdit: () -> Unit,
    onLink: () -> Unit,
    onConfirm: (ConfirmRequest) -> Unit,
    modifier: Modifier,
) {
    val strings = LocalStrings.current
    val money = { cents: Int -> Money.format(cents, strings.code) }
    val compact = LocalCompact.current
    Column(modifier.padding(horizontal = if (compact) 16.dp else 20.dp, vertical = if (compact) 8.dp else 18.dp)) {
        // Header
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Eyebrow("${strings.tabs.number(tab.number)} · ${strings.tabs.since(Times.clock(tab.openedAt))}")
                Text(tab.label, style = if (compact) MaterialTheme.typography.headlineMedium else MaterialTheme.typography.displaySmall, color = Route66.Ink, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.testTag("tab-title"))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Surface(onClick = onLink, shape = CircleShape, color = if (tab.customer != null) Route66.Blue.copy(alpha = 0.12f) else Route66.Ink.copy(alpha = 0.05f)) {
                        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Person, null, Modifier.size(16.dp), tint = Route66.Blue)
                            Spacer(Modifier.width(4.dp))
                            Text(tab.customer?.name ?: strings.tabs.linkGuest, style = MaterialTheme.typography.labelLarge, color = Route66.Blue, modifier = Modifier.testTag("tab-guest"))
                        }
                    }
                    Text(if (tab.table.isBlank()) strings.tabs.noTable else "${strings.tabs.table} ${tab.table}", style = MaterialTheme.typography.bodyMedium, color = Route66.Muted)
                }
            }
            IconButton(onClick = onEdit, modifier = Modifier.testTag("tab-edit")) { Icon(Icons.Rounded.Edit, contentDescription = strings.tabs.rename, tint = Route66.Muted) }
        }
        Spacer(Modifier.height(12.dp))
        Segmented(
            listOf(TabMode.PayLater to strings.tabs.payLater, TabMode.PayAsYouGo to strings.tabs.payAsYouGo),
            tab.mode,
            { mode -> if (mode != tab.mode) vm.updateTab(mode = mode) },
            testTagPrefix = "mode",
        )
        Spacer(Modifier.height(12.dp))

        // The round being put together
        AnimatedVisibility(state.round.isNotEmpty(), enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
            RoundPanel(state, vm, tab, onBookAndPay)
        }

        // One tap to pour the same round again.
        val last = state.lastRound[tab.id]
        if (state.round.isEmpty() && !last.isNullOrEmpty()) {
            PillButton(
                "${strings.tabs.repeatRound}: ${last.joinToString(", ") { "${it.qty}× ${it.drink.name}" }}",
                vm::repeatLastRound,
                kind = ButtonKind.Secondary,
                icon = Icons.Rounded.Replay,
                modifier = Modifier.fillMaxWidth(),
                testTag = "round-repeat",
            )
            Spacer(Modifier.height(6.dp))
        }

        // Items and payments
        LazyColumn(Modifier.weight(1f).testTag("tab-items"), contentPadding = PaddingValues(vertical = 8.dp)) {
            if (tab.items.isEmpty() && state.round.isEmpty()) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 36.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Rounded.MenuBook, null, Modifier.size(36.dp), tint = Route66.Muted.copy(alpha = 0.5f))
                        Spacer(Modifier.height(8.dp))
                        Text(if (LocalCompact.current) strings.tabs.roundEmptyPhone else strings.tabs.roundEmpty, color = Route66.Muted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            items(tab.items.asReversed(), key = { it.id }) { item -> ItemRow(item) { onItem(item) } }
            if (tab.payments.isNotEmpty()) {
                item {
                    Spacer(Modifier.height(16.dp))
                    Eyebrow(strings.tabs.payments, color = Route66.Muted)
                    Spacer(Modifier.height(6.dp))
                }
                items(tab.payments, key = { "p" + it.id }) { p ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp).alpha(if (p.refunded) 0.45f else 1f), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Payments, null, Modifier.size(18.dp), tint = Route66.Green)
                        Spacer(Modifier.width(10.dp))
                        Text("${vm.methodName(p.method)} · ${Times.clock(p.takenAt)}${if (p.tipCents > 0) " · ${strings.pay.tip} ${money(p.tipCents)}" else ""}", style = MaterialTheme.typography.bodyMedium, color = Route66.Muted, modifier = Modifier.weight(1f))
                        MoneyText(-p.amountCents, fontSize = 15.sp, color = Route66.Green, strike = p.refunded)
                    }
                }
            }
        }

        // Totals and actions
        DashedDivider()
        Spacer(Modifier.height(10.dp))
        TotalRow(strings.tabs.total, tab.totalCents)
        if (tab.paidCents > 0) TotalRow(strings.tabs.paid, -tab.paidCents, color = Route66.Green)
        Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(top = 4.dp)) {
            Text(strings.tabs.balance, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.weight(1f))
            MoneyText(tab.balanceCents, fontSize = 34.sp, color = if (tab.balanceCents > 0) Route66.Crimson else Route66.Green, weight = FontWeight.SemiBold, modifier = Modifier.testTag("tab-balance"))
        }
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PillButton(strings.tabs.pay, { onPay(tab.balanceCents) }, icon = Icons.Rounded.Payments, enabled = tab.balanceCents > 0 && !state.busy, big = true, modifier = Modifier.weight(1f), testTag = "tab-pay")
            if (tab.balanceCents == 0) {
                PillButton(strings.tabs.close, {
                    onConfirm(ConfirmRequest(strings.tabs.closeConfirm, strings.tabs.close) { vm.closeTab("close") })
                }, kind = ButtonKind.Dark, icon = Icons.Rounded.CheckCircle, enabled = !state.busy, big = true, modifier = Modifier.weight(1f), testTag = "tab-close")
            } else if (tab.customer != null) {
                PillButton(strings.tabs.putOnAccount, {
                    onConfirm(ConfirmRequest(strings.tabs.onAccountConfirm(money(tab.balanceCents), tab.customer.name), strings.tabs.putOnAccount) { vm.closeTab("on_account") })
                }, kind = ButtonKind.Blue, icon = Icons.Rounded.LockOpen, enabled = !state.busy, big = true, modifier = Modifier.weight(1f), testTag = "tab-on-account")
            }
        }
        if (state.isOwner && tab.paidCents == 0 && tab.items.any { !it.voided }) {
            Spacer(Modifier.height(6.dp))
            Text(
                strings.tabs.voidTab,
                color = Route66.Crimson,
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.clickable { onConfirm(ConfirmRequest(strings.tabs.voidConfirm, strings.tabs.voidTab, danger = true) { vm.closeTab("void") }) }.padding(8.dp),
            )
        }
    }
}

@Composable
private fun TotalRow(label: String, cents: Int, color: Color = Route66.Ink) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.bodyLarge, color = Route66.Muted, modifier = Modifier.weight(1f))
        MoneyText(cents, fontSize = 16.sp, color = color)
    }
}

@Composable
private fun RoundPanel(state: UiState, vm: AppViewModel, tab: Tab, onBookAndPay: () -> Unit) {
    val strings = LocalStrings.current
    Surface(shape = RoundedCornerShape(22.dp), color = Route66.Asphalt, contentColor = Route66.Chrome, modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).testTag("round-panel")) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(strings.tabs.round, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                MoneyText(state.roundCents, fontSize = 20.sp, color = Route66.Chrome, weight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
            state.round.forEach { line ->
                Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                    RoundStep(Icons.Rounded.Remove) { vm.changeRound(line.drink.id, -1) }
                    Text("${line.qty}", fontFamily = GeistMono, fontSize = 18.sp, modifier = Modifier.width(34.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    RoundStep(Icons.Rounded.Add) { vm.changeRound(line.drink.id, +1) }
                    Spacer(Modifier.width(10.dp))
                    Text(line.drink.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    MoneyText(line.drink.priceCents * line.qty, fontSize = 15.sp, color = Route66.Chrome.copy(alpha = 0.8f))
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PillButton(strings.tabs.clearRound, vm::clearRound, kind = ButtonKind.GhostLight, modifier = Modifier.weight(0.6f))
                if (tab.mode == TabMode.PayAsYouGo) {
                    PillButton(strings.tabs.bookAndPay, onBookAndPay, enabled = !state.busy, modifier = Modifier.weight(1.4f), testTag = "round-book-pay")
                } else {
                    PillButton(strings.tabs.book, { vm.bookRound() }, enabled = !state.busy, modifier = Modifier.weight(1.4f), testTag = "round-book")
                }
            }
        }
    }
}

@Composable
private fun RoundStep(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Surface(onClick = onClick, shape = CircleShape, color = Route66.Chrome.copy(alpha = 0.12f), contentColor = Route66.Chrome, modifier = Modifier.size(34.dp)) {
        Box(contentAlignment = Alignment.Center) { Icon(icon, null, Modifier.size(18.dp)) }
    }
}

@Composable
private fun ItemRow(item: TabItem, onClick: () -> Unit) {
    val strings = LocalStrings.current
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(vertical = 9.dp, horizontal = 6.dp).alpha(if (item.voided) 0.45f else 1f).testTag("item-${item.name}"),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("${item.qty}×", fontFamily = GeistMono, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(40.dp))
        Column(Modifier.weight(1f)) {
            Text(
                item.name,
                style = MaterialTheme.typography.titleMedium.copy(textDecoration = if (item.voided) TextDecoration.LineThrough else null),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                listOfNotNull(item.size.takeIf { it.isNotBlank() }, Times.clock(item.addedAt), item.addedBy.takeIf { it.isNotBlank() }).joinToString(" · ") +
                    when {
                        item.voided -> " · ${strings.tabs.voided}${if (item.voidReason.isNotBlank()) ": ${item.voidReason}" else ""}"
                        item.onHouse -> " · ${strings.tabs.onHouse}"
                        item.paidQty >= item.qty -> " · ✓ ${strings.tabs.paidSeparately}"
                        item.paidQty > 0 -> " · ✓ ${strings.tabs.paidPart(item.paidQty, item.qty)}"
                        else -> ""
                    },
                style = MaterialTheme.typography.bodySmall,
                color = if (item.onHouse) Route66.Blue else if (item.paidQty > 0 && !item.voided) Route66.Green else Route66.Muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (item.onHouse) Icon(Icons.Rounded.Star, null, Modifier.size(16.dp).padding(end = 4.dp), tint = Route66.Gold)
        if (item.voided) Icon(Icons.Rounded.Block, null, Modifier.size(16.dp).padding(end = 4.dp), tint = Route66.Muted)
        MoneyText(item.unitPriceCents * item.qty, fontSize = 16.sp, strike = item.voided || item.onHouse)
    }
    Divider()
}

/* ---------- Right: the menu ---------- */

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun DrinkGrid(categories: List<Category>, inRound: Map<String, Int>, onAdd: (Drink) -> Unit, modifier: Modifier) {
    val strings = LocalStrings.current
    var selected by rememberSaveable { mutableStateOf(0) }
    val category = categories.getOrNull(selected)
    val compact = LocalCompact.current
    Column(modifier.background(Route66.Paper.copy(alpha = 0.35f)).padding(if (compact) 12.dp else 18.dp)) {
        if (!compact) {
            Eyebrow(strings.tabs.categories)
            Spacer(Modifier.height(8.dp))
        }
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            categories.forEachIndexed { index, c ->
                val active = index == selected
                Surface(
                    onClick = { selected = index },
                    shape = RoundedCornerShape(16.dp),
                    color = if (active) Route66.Crimson else Color.White,
                    contentColor = if (active) Route66.Chrome else Route66.Ink,
                    border = if (active) null else androidx.compose.foundation.BorderStroke(1.dp, Route66.Ink.copy(alpha = 0.1f)),
                    modifier = Modifier.testTag("cat-${c.id}"),
                ) {
                    Column(Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                        Text(if (strings.code == "en" && c.labelEn.isNotBlank()) c.labelEn else c.label, fontFamily = Rye, fontSize = 17.sp)
                        Text(
                            (if (strings.code == "en") c.label else c.labelEn).uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = if (active) Route66.Chrome.copy(alpha = 0.7f) else Route66.Blue,
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(14.dp))
        if (category != null) {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(if (compact) 140.dp else 150.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
                modifier = Modifier.testTag("drink-grid"),
            ) {
                items(category.drinks, key = { it.id }) { drink -> DrinkTile(drink, inRound[drink.id] ?: 0) { onAdd(drink) } }
            }
        }
    }
}

@Composable
private fun DrinkTile(drink: Drink, count: Int, onTap: () -> Unit) {
    val strings = LocalStrings.current
    val bump by animateFloatAsState(if (count > 0) 1f else 0.98f, label = "bump")
    Surface(
        onClick = onTap,
        enabled = !drink.soldOut,
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(if (count > 0) 3.dp else 1.dp, if (count > 0) Route66.Crimson else Route66.Ink.copy(alpha = 0.08f)),
        modifier = Modifier.scale(bump).testTag("drink-${drink.name}-${drink.size}"),
    ) {
        Column {
            Box(Modifier.fillMaxWidth().aspectRatio(1.6f).background(Route66.Sunken)) {
                if (drink.image.isNotBlank()) {
                    AsyncImage(model = drink.image, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().alpha(if (drink.soldOut) 0.35f else 1f))
                }
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.45f)))))
                Text(
                    Money.format(drink.priceCents, strings.code),
                    fontFamily = GeistMono,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    color = Route66.Chrome,
                    modifier = Modifier.align(Alignment.BottomEnd).padding(10.dp),
                )
                if (count > 0) {
                    Box(Modifier.align(Alignment.TopEnd).padding(8.dp).size(32.dp).clip(CircleShape).background(Route66.Crimson), contentAlignment = Alignment.Center) {
                        Text("$count", color = Route66.Chrome, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }
                if (drink.soldOut) Badge(strings.tabs.soldOut, Route66.Crimson, Modifier.align(Alignment.TopStart).padding(8.dp))
                if (drink.featured) Icon(Icons.Rounded.Star, null, Modifier.align(Alignment.TopStart).padding(8.dp).size(20.dp), tint = Route66.Gold)
            }
            Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                Text(drink.name, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(drink.size.ifBlank { " " }, style = MaterialTheme.typography.bodySmall, color = Route66.Muted, maxLines = 1)
            }
        }
    }
}
