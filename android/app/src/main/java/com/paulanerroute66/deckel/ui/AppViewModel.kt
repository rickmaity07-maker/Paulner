package com.paulanerroute66.deckel.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paulanerroute66.deckel.DeckelApp
import com.paulanerroute66.deckel.data.ApiException
import com.paulanerroute66.deckel.data.Bootstrap
import com.paulanerroute66.deckel.data.Customer
import com.paulanerroute66.deckel.data.Drink
import com.paulanerroute66.deckel.data.Money
import com.paulanerroute66.deckel.data.PayMethod
import com.paulanerroute66.deckel.data.RoundLine
import com.paulanerroute66.deckel.data.Stats
import com.paulanerroute66.deckel.data.Tab
import com.paulanerroute66.deckel.data.TabMode
import com.paulanerroute66.deckel.data.Times
import com.paulanerroute66.deckel.data.User
import com.paulanerroute66.deckel.i18n.Strings
import com.paulanerroute66.deckel.i18n.stringsFor
import com.paulanerroute66.deckel.payments.PaymentStep
import com.paulanerroute66.deckel.payments.ReaderMode
import com.paulanerroute66.deckel.payments.ReaderState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.LocalDate

enum class Phase { Loading, SignedOut, SignedIn }
enum class Screen { Tabs, Guests, Stats, History, Settings }
enum class TabFilter { All, Guests, WalkIns }
enum class GuestFilter { All, Regulars, Owing }
enum class StatsRange { Today, Yesterday, Week, Month }

data class UiState(
    val phase: Phase = Phase.Loading,
    val user: User? = null,
    val language: String = "de",
    val menu: Bootstrap? = null,
    val offline: Boolean = false,
    val screen: Screen = Screen.Tabs,
    val busy: Boolean = false,
    val loginBusy: Boolean = false,
    val loginError: String? = null,
    // Tabs
    val openTabs: List<Tab> = emptyList(),
    val tabsLoaded: Boolean = false,
    val tabFilter: TabFilter = TabFilter.All,
    val tabQuery: String = "",
    val selectedTabId: String? = null,
    val selectedTab: Tab? = null,
    val round: List<RoundLine> = emptyList(),
    val lastRound: Map<String, List<RoundLine>> = emptyMap(),
    val paymentStep: PaymentStep? = null,
    // Guests
    val guests: List<Customer> = emptyList(),
    val guestQuery: String = "",
    val guestFilter: GuestFilter = GuestFilter.All,
    val selectedGuest: Customer? = null,
    // Figures
    val stats: Stats? = null,
    val statsRange: StatsRange = StatsRange.Today,
    // History
    val historyDate: LocalDate = Times.today(),
    val historyTabs: List<Tab> = emptyList(),
    val historySelected: Tab? = null,
    // Card reader
    val readerMode: ReaderMode = ReaderMode.Off,
    val readerState: ReaderState = ReaderState.Off,
    // Online updates
    val update: com.paulanerroute66.deckel.updates.UpdateState = com.paulanerroute66.deckel.updates.UpdateState.Idle,
    val updateDismissed: Boolean = false,
) {
    val strings: Strings get() = stringsFor(language)
    val isOwner get() = user?.isOwner == true
    val roundCents get() = round.sumOf { it.drink.priceCents * it.qty }

    val visibleTabs: List<Tab>
        get() = openTabs
            .filter {
                when (tabFilter) {
                    TabFilter.All -> true
                    TabFilter.Guests -> it.customer != null
                    TabFilter.WalkIns -> it.customer == null
                }
            }
            .filter { tabQuery.isBlank() || it.label.contains(tabQuery, true) || it.table.contains(tabQuery, true) || "${it.number}" == tabQuery.trim() }

    val visibleGuests: List<Customer>
        get() = guests.filter {
            when (guestFilter) {
                GuestFilter.All -> true
                GuestFilter.Regulars -> it.regular
                GuestFilter.Owing -> it.balanceCents > 0
            }
        }
}

data class Notice(val text: String, val error: Boolean = false, val undo: (() -> Unit)? = null)

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val container = (app as DeckelApp).container
    private val api = container.api
    private val session = container.session
    private val reader = container.reader
    private val updater = container.updater

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state
    private val _notices = MutableSharedFlow<Notice>(extraBufferCapacity = 8)
    val notices: SharedFlow<Notice> = _notices

    private var poller: Job? = null
    private val strings get() = _state.value.strings

    init {
        viewModelScope.launch {
            val saved = session.load()
            _state.update { it.copy(language = saved.language, readerMode = ReaderMode.of(saved.reader)) }
            if (saved.token != null && saved.user != null) startSession(saved.user) else _state.update { it.copy(phase = Phase.SignedOut) }
        }
        viewModelScope.launch { reader.state.collect { s -> _state.update { it.copy(readerState = s) } } }
        viewModelScope.launch { updater.state.collect { s -> _state.update { it.copy(update = s) } } }
        // Look for a new version right away, then every half hour, signed in or not.
        viewModelScope.launch {
            while (isActive) {
                // Also into the notification bar, so it's seen while the app is in the background.
                (updater.check() as? com.paulanerroute66.deckel.updates.UpdateState.Available)?.let {
                    com.paulanerroute66.deckel.updates.UpdateNotifier.announce(getApplication(), it.release, _state.value.language)
                }
                delay(30 * 60_000L)
            }
        }
    }

    /* ---------- Online updates ---------- */

    fun checkForUpdates() = viewModelScope.launch {
        _state.update { it.copy(updateDismissed = false) }
        if (updater.check() is com.paulanerroute66.deckel.updates.UpdateState.Idle) notify(strings.update.upToDate)
    }

    fun installUpdate(release: com.paulanerroute66.deckel.updates.Release) {
        _state.update { it.copy(updateDismissed = false) }
        viewModelScope.launch { updater.downloadAndInstall(release) }
    }

    fun dismissUpdate() = _state.update { it.copy(updateDismissed = true) }
    fun retryUpdate() = updater.dismissFailure()
    fun updatePermissionIntent() = updater.permissionIntent()
    val currentVersionName: String get() = com.paulanerroute66.deckel.BuildConfig.VERSION_NAME

    /* ---------- Plumbing ---------- */

    private fun notify(text: String, error: Boolean = false, undo: (() -> Unit)? = null) {
        _notices.tryEmit(Notice(text, error, undo))
    }

    /* Runs an API call with the busy flag, offline detection and translated errors. */
    private fun act(showBusy: Boolean = true, block: suspend () -> Unit) {
        viewModelScope.launch {
            if (showBusy) _state.update { it.copy(busy = true) }
            try {
                block()
                _state.update { it.copy(offline = false) }
            } catch (e: ApiException) {
                handle(e)
            } finally {
                if (showBusy) _state.update { it.copy(busy = false) }
            }
        }
    }

    private suspend fun handle(e: ApiException) {
        when (e.code) {
            "offline" -> _state.update { it.copy(offline = true) }.also { notify(strings.error("offline"), error = true) }
            "unauthorized" -> signOut(silent = true).also { notify(strings.error("unauthorized"), error = true) }
            "drink_not_found" -> {
                notify(strings.error(e.code), error = true)
                runCatching { api.bootstrap() }.getOrNull()?.let { menu -> _state.update { it.copy(menu = menu) } }
            }
            else -> notify(strings.error(e.code), error = true)
        }
    }

    private fun startSession(user: User) {
        _state.update { it.copy(phase = Phase.SignedIn, user = user, loginBusy = false, loginError = null) }
        act(showBusy = false) {
            val menu = api.bootstrap()
            _state.update { it.copy(menu = menu, user = menu.user) }
        }
        refreshTabs()
        poller?.cancel()
        poller = viewModelScope.launch {
            var tick = 0
            while (isActive) {
                delay(6_000)
                tick++
                if (_state.value.phase != Phase.SignedIn) break
                // Quietly keep every tablet in step; failures only flip the offline banner.
                try {
                    if (!_state.value.busy && _state.value.paymentStep == null) {
                        val tabs = api.openTabs()
                        val selectedId = _state.value.selectedTabId
                        val detail = selectedId?.let { id -> if (tabs.any { it.id == id }) api.tab(id) else null }
                        _state.update { s -> s.copy(openTabs = tabs, offline = false, selectedTab = if (s.selectedTabId == selectedId && detail != null) detail else s.selectedTab) }
                    }
                    // The menu every 30 seconds, so price changes and sold-out drinks from the website arrive quickly.
                    if (tick % 5 == 0) api.bootstrap().let { menu -> _state.update { it.copy(menu = menu) } }
                } catch (e: ApiException) {
                    if (e.code == "offline") _state.update { it.copy(offline = true) } else if (e.code == "unauthorized") signOut(silent = true)
                }
            }
        }
        val mode = _state.value.readerMode
        if (mode != ReaderMode.Off) viewModelScope.launch { reader.connect(mode) }
    }

    /* ---------- Session ---------- */

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) return
        _state.update { it.copy(loginBusy = true, loginError = null) }
        viewModelScope.launch {
            try {
                val result = api.login(email.trim(), password)
                session.signIn(result.token, result.user)
                startSession(result.user)
            } catch (e: ApiException) {
                _state.update { it.copy(loginBusy = false, loginError = strings.error(e.code)) }
            }
        }
    }

    fun signOut(silent: Boolean = false) {
        poller?.cancel()
        viewModelScope.launch {
            if (!silent) api.logout()
            session.signOut()
            reader.disconnect()
            _state.update { UiState(phase = Phase.SignedOut, language = it.language, readerMode = it.readerMode) }
        }
    }

    fun setLanguage(code: String) {
        _state.update { it.copy(language = code) }
        viewModelScope.launch { session.setLanguage(code) }
    }

    fun go(screen: Screen) {
        _state.update { it.copy(screen = screen) }
        when (screen) {
            Screen.Tabs -> refreshTabs()
            Screen.Guests -> searchGuests(_state.value.guestQuery)
            Screen.Stats -> loadStats(_state.value.statsRange)
            Screen.History -> loadHistory(_state.value.historyDate)
            Screen.Settings -> Unit
        }
    }

    /* ---------- Tabs ---------- */

    fun refreshTabs() = act(showBusy = false) {
        val tabs = api.openTabs()
        _state.update { it.copy(openTabs = tabs, tabsLoaded = true) }
        _state.value.selectedTabId?.takeIf { id -> tabs.any { it.id == id } }?.let { id ->
            val detail = api.tab(id)
            _state.update { if (it.selectedTabId == id) it.copy(selectedTab = detail) else it }
        }
    }

    fun setTabFilter(filter: TabFilter) = _state.update { it.copy(tabFilter = filter) }
    fun setTabQuery(query: String) = _state.update { it.copy(tabQuery = query) }

    fun selectTab(id: String?) {
        // Show the summary straight away; the full tab (items, payments) follows a moment later.
        _state.update {
            it.copy(
                selectedTabId = id,
                selectedTab = it.selectedTab?.takeIf { t -> t.id == id } ?: it.openTabs.firstOrNull { t -> t.id == id },
                round = if (it.selectedTabId == id) it.round else emptyList(),
            )
        }
        if (id == null) return
        act(showBusy = false) {
            val tab = api.tab(id)
            _state.update { if (it.selectedTabId == id) it.copy(selectedTab = tab) else it }
        }
    }

    private fun applyTab(tab: Tab) {
        _state.update { s ->
            val list = if (tab.status == com.paulanerroute66.deckel.data.TabStatus.Open) {
                if (s.openTabs.any { it.id == tab.id }) s.openTabs.map { if (it.id == tab.id) tab else it } else s.openTabs + tab
            } else s.openTabs.filterNot { it.id == tab.id }
            s.copy(openTabs = list, selectedTab = if (s.selectedTabId == tab.id) tab else s.selectedTab)
        }
    }

    fun openTab(label: String, table: String, mode: TabMode, customerId: String?) = act {
        val tab = api.openTab(label.trim(), table.trim(), mode, customerId)
        applyTab(tab)
        _state.update { it.copy(screen = Screen.Tabs, selectedTabId = tab.id, selectedTab = tab, round = emptyList()) }
    }

    fun updateTab(label: String? = null, table: String? = null, mode: TabMode? = null, note: String? = null) {
        val id = _state.value.selectedTabId ?: return
        act { applyTab(api.updateTab(id, label = label, table = table, mode = mode, note = note)) }
    }

    fun linkGuest(customerId: String?) {
        val id = _state.value.selectedTabId ?: return
        act { applyTab(if (customerId == null) api.updateTab(id, clearCustomer = true) else api.updateTab(id, customerId = customerId)) }
    }

    /* The round being put together before it's booked. */
    fun addToRound(drink: Drink) {
        if (drink.soldOut) return notify(strings.error("drink_sold_out"), error = true)
        _state.update { s ->
            val existing = s.round.firstOrNull { it.drink.id == drink.id }
            s.copy(round = if (existing != null) s.round.map { if (it.drink.id == drink.id) it.copy(qty = (it.qty + 1).coerceAtMost(99)) else it } else s.round + RoundLine(drink, 1))
        }
    }

    fun changeRound(drinkId: String, delta: Int) = _state.update { s ->
        s.copy(round = s.round.mapNotNull { if (it.drink.id == drinkId) it.copy(qty = it.qty + delta).takeIf { l -> l.qty > 0 } else it })
    }

    fun clearRound() = _state.update { it.copy(round = emptyList()) }

    fun repeatLastRound() {
        val id = _state.value.selectedTabId ?: return
        val last = _state.value.lastRound[id] ?: return
        val menu = _state.value.menu?.categories?.flatMap { it.drinks }?.associateBy { it.id } ?: return
        _state.update { it.copy(round = last.mapNotNull { l -> menu[l.drink.id]?.takeUnless { d -> d.soldOut }?.let { d -> RoundLine(d, l.qty) } }) }
    }

    /* Books the round; with payNow the round is paid in the same request (pay-as-you-go, cash or terminal). */
    fun bookRound(payNow: PayMethod? = null, tipCents: Int = 0, then: () -> Unit = {}) {
        val s = _state.value
        val id = s.selectedTabId ?: return
        if (s.round.isEmpty()) return
        val lines = s.round
        act {
            val tab = api.addItems(id, lines, payNow, tipCents)
            applyTab(tab)
            _state.update { it.copy(round = emptyList(), lastRound = it.lastRound + (id to lines)) }
            notify(strings.common.added(lines.joinToString(", ") { "${it.qty}× ${it.drink.name}" }))
            then()
        }
    }

    fun voidItem(itemId: String, reason: String) {
        val id = _state.value.selectedTabId ?: return
        act { applyTab(api.voidItem(id, itemId, reason)) }
    }

    fun setOnHouse(itemId: String, onHouse: Boolean) {
        val id = _state.value.selectedTabId ?: return
        act { applyTab(api.setOnHouse(id, itemId, onHouse)) }
    }

    fun setQty(itemId: String, qty: Int) {
        val id = _state.value.selectedTabId ?: return
        act { applyTab(api.setQty(id, itemId, qty)) }
    }

    /* `items` set: a guest pays for just those drinks (split bill); the server works out the amount. */
    fun pay(amountCents: Int, tipCents: Int, method: PayMethod, done: () -> Unit, items: List<com.paulanerroute66.deckel.data.PaidItem>? = null) {
        val id = _state.value.selectedTabId ?: return
        if (method == PayMethod.TapToPay) return chargeCard(id, amountCents, tipCents, items, done)
        act {
            applyTab(api.pay(id, amountCents, tipCents, method, items))
            notify("${Money.format(amountCents, strings.code)} · ${methodName(method)}")
            done()
        }
    }

    private fun chargeCard(tabId: String, amountCents: Int, tipCents: Int, items: List<com.paulanerroute66.deckel.data.PaidItem>?, done: () -> Unit) {
        viewModelScope.launch {
            try {
                val tab = reader.charge(tabId, amountCents, tipCents, items) { step -> _state.update { it.copy(paymentStep = step) } }
                applyTab(tab)
                notify("${Money.format(amountCents + tipCents, strings.code)} · ${strings.pay.tapToPay} ✓")
                done()
            } catch (e: ApiException) {
                if (e.code != "payment_canceled") handle(if (e.code == "reader_offline") ApiException("reader", 0) else e)
            } finally {
                _state.update { it.copy(paymentStep = null) }
            }
        }
    }

    fun cancelCardPayment() = reader.cancelPayment()

    fun closeTab(action: String) {
        val id = _state.value.selectedTabId ?: return
        act {
            val tab = api.closeTab(id, action)
            applyTab(tab)
            if (action != "reopen") _state.update { it.copy(selectedTabId = null, selectedTab = null, round = emptyList()) }
            notify(
                when (action) {
                    "close" -> "${tab.label}: ${strings.tabs.closed}"
                    "on_account" -> "${tab.label}: ${strings.tabs.onAccount}"
                    "void" -> "${tab.label}: ${strings.tabs.voidStatus}"
                    else -> tab.label
                },
            )
        }
    }

    fun reopenFromHistory(tab: Tab) = act {
        val reopened = api.closeTab(tab.id, "reopen")
        applyTab(reopened)
        _state.update { it.copy(screen = Screen.Tabs, selectedTabId = reopened.id, selectedTab = reopened, historySelected = null) }
    }

    fun refund(paymentId: String) = act {
        api.refund(paymentId)
        _state.value.selectedTabId?.let { applyTab(api.tab(it)) }
    }

    fun methodName(method: PayMethod) = when (method) {
        PayMethod.Cash -> strings.pay.cash
        PayMethod.CardTerminal -> strings.pay.cardTerminal
        PayMethod.TapToPay -> strings.pay.tapToPay
        PayMethod.Other -> strings.pay.other
    }

    /* ---------- Guests ---------- */

    fun searchGuests(query: String) {
        _state.update { it.copy(guestQuery = query) }
        act(showBusy = false) {
            val list = api.customers(query)
            if (_state.value.guestQuery == query) _state.update { it.copy(guests = list) }
        }
    }

    fun setGuestFilter(filter: GuestFilter) = _state.update { it.copy(guestFilter = filter) }

    fun selectGuest(id: String?) {
        if (id == null) return _state.update { it.copy(selectedGuest = null) }
        act(showBusy = false) { _state.update { s -> s.copy(selectedGuest = api.customer(id)) } }
    }

    fun saveGuest(id: String?, name: String, phone: String, email: String, note: String, regular: Boolean, creditLimitCents: Int?, then: (Customer) -> Unit = {}) = act {
        val saved = api.saveCustomer(id, name.trim(), phone.trim(), email.trim(), note.trim(), regular, creditLimitCents)
        _state.update { s -> s.copy(selectedGuest = saved, guests = listOf(saved) + s.guests.filterNot { it.id == saved.id }) }
        then(saved)
    }

    fun archiveGuest(id: String) = act {
        api.archiveCustomer(id, true)
        _state.update { s -> s.copy(selectedGuest = null, guests = s.guests.filterNot { it.id == id }) }
    }

    fun settleGuest(id: String, amountCents: Int, method: PayMethod, done: () -> Unit) = act {
        val updated = api.settle(id, amountCents, method)
        _state.update { s -> s.copy(selectedGuest = updated, guests = s.guests.map { if (it.id == id) updated else it }) }
        notify("${Money.format(amountCents, strings.code)} · ${methodName(method)}")
        done()
    }

    fun openTabForGuest(guest: Customer) {
        if (guest.openTabId != null) {
            _state.update { it.copy(screen = Screen.Tabs) }
            refreshTabs()
            selectTab(guest.openTabId)
        } else openTab(guest.name, "", TabMode.PayLater, guest.id)
    }

    /* ---------- Figures & history ---------- */

    fun loadStats(range: StatsRange) {
        _state.update { it.copy(statsRange = range) }
        val today = Times.today()
        val (from, to) = when (range) {
            StatsRange.Today -> today to today
            StatsRange.Yesterday -> today.minusDays(1) to today.minusDays(1)
            StatsRange.Week -> today.minusDays(6) to today
            StatsRange.Month -> today.minusDays(29) to today
        }
        act(showBusy = false) { _state.update { it.copy(stats = api.stats(from.toString(), to.toString())) } }
    }

    fun loadHistory(date: LocalDate) {
        _state.update { it.copy(historyDate = date, historySelected = null) }
        act(showBusy = false) {
            val list = api.closedTabs(date.toString())
            if (_state.value.historyDate == date) _state.update { it.copy(historyTabs = list) }
        }
    }

    fun selectHistory(id: String?) {
        if (id == null) return _state.update { it.copy(historySelected = null) }
        act(showBusy = false) { _state.update { it.copy(historySelected = api.tab(id)) } }
    }

    /* ---------- Card reader ---------- */

    fun setReaderMode(mode: ReaderMode) {
        _state.update { it.copy(readerMode = mode) }
        viewModelScope.launch {
            session.setReader(mode.wire)
            reader.connect(mode)
        }
    }

    fun reconnectReader() = viewModelScope.launch { reader.connect(_state.value.readerMode) }
}
