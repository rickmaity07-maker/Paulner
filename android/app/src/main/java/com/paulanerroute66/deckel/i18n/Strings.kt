package com.paulanerroute66.deckel.i18n

import androidx.compose.runtime.staticCompositionLocalOf

/*
  Every word the app shows, German first, English second, mirroring the
  website's lib/i18n.ts. Switched in Settings; the choice is saved.
*/
data class Strings(
    val code: String,
    val appName: String = "Deckel",
    val nav: Nav,
    val login: Login,
    val tabs: Tabs,
    val pay: Pay,
    val item: ItemCopy,
    val guests: Guests,
    val stats: StatsCopy,
    val history: History,
    val settings: Settings,
    val common: Common,
    val errors: Map<String, String>,
) {
    fun error(code: String) = errors[code] ?: errors.getValue("unknown")
}

data class Nav(val tabs: String, val guests: String, val stats: String, val history: String, val settings: String)

data class Login(
    val title: String, val subtitle: String, val email: String, val password: String, val submit: String, val busy: String, val server: String,
)

data class Tabs(
    val open: String, val newTab: String, val search: String, val all: String, val withGuest: String, val walkIn: String, val empty: String,
    val emptyHint: String, val pickOne: String, val pickHint: String, val since: (String) -> String, val drinksCount: (Int) -> String,
    val table: String, val noTable: String, val payAsYouGo: String, val payLater: String, val payAsYouGoHint: String, val payLaterHint: String,
    val total: String, val paid: String, val balance: String, val pay: String, val putOnAccount: String, val close: String, val reopen: String,
    val voidTab: String, val round: String, val roundEmpty: String, val book: String, val bookAndPay: String, val clearRound: String,
    val repeatRound: String, val payments: String, val onHouse: String, val voided: String, val rename: String, val label: String,
    val note: String, val linkGuest: String, val unlinkGuest: String, val newTabTitle: String, val forGuest: String, val forWalkIn: String,
    val walkInLabel: String, val walkInHint: String, val searchGuest: String, val createGuest: String, val openTab: String, val goToTab: String,
    val alreadyOpen: String, val closeConfirm: String, val onAccountConfirm: (String, String) -> String, val voidConfirm: String,
    val soldOut: String, val owes: (String) -> String, val by: (String) -> String, val modeTitle: String, val number: (Int) -> String,
    val closed: String, val onAccount: String, val voidStatus: String, val categories: String,
)

data class Pay(
    val title: String, val due: String, val amount: String, val tip: String, val noTip: String, val roundUp: String, val rest: String,
    val half: String, val method: String, val cash: String, val cardTerminal: String, val tapToPay: String, val other: String,
    val given: String, val change: (String) -> String, val confirm: (String) -> String, val tapPrompt: String, val tapWaiting: String,
    val tapProcessing: String, val tapSuccess: String, val tapCancel: String, val simulated: String, val readerOffline: String,
    val settleTitle: String, val settleHint: (String) -> String, val partial: String, val methodOf: (String) -> String,
)

data class ItemCopy(
    val title: String, val qty: String, val voidTitle: String, val reasons: List<String>, val customReason: String, val voidAction: String,
    val onHouse: String, val charge: String, val addedAt: (String, String) -> String, val ownerOnly: String, val save: String,
)

data class Guests(
    val title: String, val search: String, val all: String, val regulars: String, val owing: String, val empty: String, val newGuest: String,
    val editGuest: String, val name: String, val phone: String, val email: String, val note: String, val regular: String, val creditLimit: String,
    val creditHint: String, val balance: String, val spent: String, val visits: String, val lastVisit: String, val favourites: String,
    val tabsHistory: String, val settle: String, val archive: String, val openTab: String, val goToTab: String, val nothingOwed: String,
    val never: String, val pick: String, val save: String, val noFavourites: String, val call: String,
)

data class StatsCopy(
    val title: String, val today: String, val yesterday: String, val week: String, val month: String, val revenue: String, val tips: String,
    val payments: String, val openTabs: String, val onAccount: String, val voids: String, val byHour: String, val byMethod: String,
    val topDrinks: String, val noData: String, val guestsCount: (Int) -> String, val sold: (Int) -> String,
)

data class History(val title: String, val today: String, val empty: String, val pick: String, val readOnly: String)

data class Settings(
    val title: String, val account: String, val role: (String) -> String, val language: String, val reader: String, val readerHint: String,
    val readerTapToPay: String, val readerSimulator: String, val readerOff: String, val readerStatus: String, val connect: String,
    val disconnect: String, val connected: (String) -> String, val notConnected: String, val connecting: String, val server: String,
    val version: String, val signOut: String, val signOutConfirm: String, val ttpUnsupported: String,
)

data class Common(
    val cancel: String, val save: String, val ok: String, val retry: String, val back: String, val offline: String, val loading: String,
    val done: String, val yes: String, val no: String, val owner: String, val staff: String, val refresh: String, val undo: String,
    val added: (String) -> String,
)

private val errorsDe = mapOf(
    "offline" to "Keine Verbindung zum Server. Bitte WLAN prüfen.",
    "unauthorized" to "Bitte neu anmelden.",
    "credentials" to "E-Mail oder Passwort stimmen nicht.",
    "too_many" to "Zu viele Versuche. Bitte in 15 Minuten erneut.",
    "no_app_access" to "Dieses Konto darf die Deckel-App nicht nutzen. Der Inhaber kann es unter „Nutzer & Rollen“ auf „Personal“ stellen.",
    "forbidden" to "Das darf nur der Inhaber.",
    "tab_not_open" to "Dieser Deckel ist nicht mehr offen.",
    "customer_has_open_tab" to "Dieser Gast hat schon einen offenen Deckel.",
    "balance_not_zero" to "Erst bezahlen oder anschreiben, dann abschließen.",
    "on_account_needs_customer" to "Anschreiben geht nur mit einem Gast. Verknüpft zuerst einen Gast.",
    "nothing_owed" to "Auf diesem Deckel ist nichts offen.",
    "credit_limit_exceeded" to "Das Anschreibe-Limit des Gastes ist erreicht. Der Inhaber kann es freigeben.",
    "amount_exceeds_balance" to "Der Betrag ist höher als der offene Betrag.",
    "drink_sold_out" to "Dieses Getränk ist gerade ausverkauft.",
    "drink_not_found" to "Dieses Getränk steht nicht mehr auf der Karte. Die Karte wird neu geladen.",
    "void_needs_owner" to "Ältere oder fremde Buchungen kann nur der Inhaber stornieren.",
    "on_house_needs_owner" to "Aufs Haus kann nur der Inhaber geben.",
    "reopen_needs_owner" to "Nur der Inhaber kann einen Deckel wieder öffnen.",
    "tab_has_payments" to "Deckel mit Zahlungen können nicht storniert werden.",
    "customer_owes_money" to "Gäste mit offenen Beträgen können nicht archiviert werden.",
    "credit_limit_needs_owner" to "Das Anschreibe-Limit kann nur der Inhaber ändern.",
    "name_required" to "Bitte einen Namen angeben.",
    "label_required" to "Bitte einen Namen für den Deckel angeben.",
    "email_invalid" to "Die E-Mail-Adresse sieht nicht richtig aus.",
    "stripe_not_configured" to "Kartenzahlung per Tap to Pay ist noch nicht eingerichtet.",
    "payment_not_succeeded" to "Die Kartenzahlung wurde nicht abgeschlossen.",
    "amount_invalid" to "Ungültiger Betrag (Karte: mindestens 0,50 €).",
    "reader" to "Der Kartenleser meldet einen Fehler.",
    "unknown" to "Das hat nicht geklappt. Bitte noch einmal versuchen.",
)

private val errorsEn = mapOf(
    "offline" to "No connection to the server. Check the Wi-Fi.",
    "unauthorized" to "Please sign in again.",
    "credentials" to "Email or password is wrong.",
    "too_many" to "Too many attempts. Try again in 15 minutes.",
    "no_app_access" to "This account may not use the tab app. The owner can set it to \"Staff\" under users & roles.",
    "forbidden" to "Only the owner can do that.",
    "tab_not_open" to "This tab is no longer open.",
    "customer_has_open_tab" to "This guest already has an open tab.",
    "balance_not_zero" to "Take payment or put it on account before closing.",
    "on_account_needs_customer" to "Only tabs linked to a guest can go on account. Link a guest first.",
    "nothing_owed" to "Nothing is owed on this tab.",
    "credit_limit_exceeded" to "The guest's credit limit is reached. The owner can override it.",
    "amount_exceeds_balance" to "That's more than what's owed.",
    "drink_sold_out" to "That drink is sold out right now.",
    "drink_not_found" to "That drink is no longer on the menu. Reloading the menu.",
    "void_needs_owner" to "Only the owner can void older entries or someone else's.",
    "on_house_needs_owner" to "Only the owner can put drinks on the house.",
    "reopen_needs_owner" to "Only the owner can reopen a tab.",
    "tab_has_payments" to "Tabs with payments can't be voided.",
    "customer_owes_money" to "Guests who owe money can't be archived.",
    "credit_limit_needs_owner" to "Only the owner can change the credit limit.",
    "name_required" to "Please enter a name.",
    "label_required" to "Please give the tab a name.",
    "email_invalid" to "That email address looks wrong.",
    "stripe_not_configured" to "Tap to Pay card payments aren't set up yet.",
    "payment_not_succeeded" to "The card payment didn't complete.",
    "amount_invalid" to "Invalid amount (card: at least €0.50).",
    "reader" to "The card reader reported an error.",
    "unknown" to "That didn't work. Please try again.",
)

val German = Strings(
    code = "de",
    nav = Nav("Deckel", "Gäste", "Übersicht", "Verlauf", "Einstellungen"),
    login = Login(
        title = "Deckel", subtitle = "Melde dich mit deinem Konto von der Website an.", email = "E-Mail", password = "Passwort",
        submit = "Anmelden", busy = "Einen Moment …", server = "Server",
    ),
    tabs = Tabs(
        open = "Offene Deckel", newTab = "Neuer Deckel", search = "Deckel suchen", all = "Alle", withGuest = "Gäste", walkIn = "Laufkundschaft",
        empty = "Keine offenen Deckel", emptyHint = "Tippe auf „Neuer Deckel“, wenn jemand bestellt.", pickOne = "Wähle einen Deckel",
        pickHint = "Links einen Deckel antippen oder einen neuen anlegen.", since = { "seit $it" }, drinksCount = { if (it == 1) "1 Getränk" else "$it Getränke" },
        table = "Tisch", noTable = "ohne Tisch", payAsYouGo = "Sofort zahlen", payLater = "Später zahlen",
        payAsYouGoHint = "Jede Runde wird direkt bezahlt", payLaterHint = "Alles läuft auf, Zahlung am Ende",
        total = "Summe", paid = "Bezahlt", balance = "Offen", pay = "Bezahlen", putOnAccount = "Anschreiben", close = "Abschließen", reopen = "Wieder öffnen",
        voidTab = "Deckel stornieren", round = "Neue Runde", roundEmpty = "Getränke rechts antippen", book = "Buchen", bookAndPay = "Buchen & bezahlen",
        clearRound = "Leeren", repeatRound = "Nochmal", payments = "Zahlungen", onHouse = "aufs Haus", voided = "storniert", rename = "Bearbeiten",
        label = "Name", note = "Notiz", linkGuest = "Gast verknüpfen", unlinkGuest = "Gast lösen", newTabTitle = "Neuer Deckel", forGuest = "Für einen Gast",
        forWalkIn = "Laufkundschaft", walkInLabel = "Name oder Beschreibung", walkInHint = "z. B. „Junggesellenabschied“ oder „Blaues Hemd“",
        searchGuest = "Gast suchen …", createGuest = "Neuen Gast anlegen", openTab = "Deckel öffnen", goToTab = "Zum offenen Deckel",
        alreadyOpen = "hat einen offenen Deckel", closeConfirm = "Deckel abschließen?", onAccountConfirm = { amount, name -> "$amount bei $name anschreiben?" },
        voidConfirm = "Den ganzen Deckel stornieren? Alle Getränke werden storniert.", soldOut = "aus", owes = { "schuldet $it" }, by = { "von $it" },
        modeTitle = "Zahlweise", number = { "Nr. $it" }, closed = "Abgeschlossen", onAccount = "Angeschrieben", voidStatus = "Storniert", categories = "Karte",
    ),
    pay = Pay(
        title = "Bezahlen", due = "Offen", amount = "Betrag", tip = "Trinkgeld", noTip = "Kein", roundUp = "Aufrunden", rest = "Alles", half = "Hälfte",
        method = "Zahlart", cash = "Bar", cardTerminal = "Karte (Gerät)", tapToPay = "Tap to Pay", other = "Sonstiges", given = "Gegeben",
        change = { "Rückgeld: $it" }, confirm = { "$it kassieren" }, tapPrompt = "Karte oder Handy an das Tablet halten",
        tapWaiting = "Warte auf Karte …", tapProcessing = "Zahlung wird verarbeitet …", tapSuccess = "Bezahlt!", tapCancel = "Abbrechen",
        simulated = "Testmodus: simulierter Kartenleser", readerOffline = "Kartenleser nicht verbunden", settleTitle = "Schulden begleichen",
        settleHint = { "Offen: $it. Der älteste Deckel wird zuerst beglichen." }, partial = "Teilbetrag", methodOf = { it },
    ),
    item = ItemCopy(
        title = "Getränk", qty = "Menge", voidTitle = "Stornieren", reasons = listOf("Falsch getippt", "Verschüttet", "Reklamation", "Doppelt gebucht"),
        customReason = "Anderer Grund", voidAction = "Stornieren", onHouse = "Aufs Haus", charge = "Wieder berechnen",
        addedAt = { time, who -> "$time · $who" }, ownerOnly = "nur Inhaber", save = "Speichern",
    ),
    guests = Guests(
        title = "Gäste", search = "Name, Telefon, E-Mail …", all = "Alle", regulars = "Stammgäste", owing = "Mit Schulden", empty = "Keine Gäste gefunden",
        newGuest = "Neuer Gast", editGuest = "Gast bearbeiten", name = "Name", phone = "Telefon", email = "E-Mail", note = "Notiz (z. B. Lieblingsgetränk)",
        regular = "Stammgast", creditLimit = "Anschreibe-Limit (€)", creditHint = "0 = kein Limit. Nur der Inhaber kann es ändern.", balance = "Offen",
        spent = "Umsatz", visits = "Besuche", lastVisit = "Zuletzt", favourites = "Trinkt am liebsten", tabsHistory = "Deckel", settle = "Schulden begleichen",
        archive = "Archivieren", openTab = "Deckel öffnen", goToTab = "Zum offenen Deckel", nothingOwed = "Alles bezahlt", never = "noch nie",
        pick = "Wähle einen Gast", save = "Speichern", noFavourites = "Noch keine Getränke", call = "Anrufen",
    ),
    stats = StatsCopy(
        title = "Übersicht", today = "Heute", yesterday = "Gestern", week = "7 Tage", month = "30 Tage", revenue = "Umsatz", tips = "Trinkgeld",
        payments = "Zahlungen", openTabs = "Offene Deckel", onAccount = "Angeschrieben", voids = "Stornos", byHour = "Umsatz nach Uhrzeit",
        byMethod = "Nach Zahlart", topDrinks = "Meistverkauft", noData = "Noch keine Umsätze in diesem Zeitraum.",
        guestsCount = { if (it == 1) "1 Gast" else "$it Gäste" }, sold = { "$it×" },
    ),
    history = History(title = "Verlauf", today = "Heute", empty = "An diesem Tag wurde kein Deckel abgeschlossen.", pick = "Wähle einen Deckel", readOnly = "Abgeschlossen – nur ansehen"),
    settings = Settings(
        title = "Einstellungen", account = "Angemeldet als", role = { if (it == "owner") "Inhaber" else "Personal" }, language = "Sprache",
        reader = "Kartenzahlung", readerHint = "Tap to Pay: das Tablet liest Karten per NFC. Der Simulator ist zum Testen ohne echte Karte.",
        readerTapToPay = "Tap to Pay (NFC)", readerSimulator = "Simulator (Test)", readerOff = "Aus", readerStatus = "Status", connect = "Verbinden",
        disconnect = "Trennen", connected = { "Verbunden: $it" }, notConnected = "Nicht verbunden", connecting = "Verbinde …", server = "Server",
        version = "Version", signOut = "Abmelden", signOutConfirm = "Wirklich abmelden?",
        ttpUnsupported = "Dieses Gerät unterstützt Tap to Pay nicht (nötig: NFC, Android 13+, kein Emulator).",
    ),
    common = Common(
        cancel = "Abbrechen", save = "Speichern", ok = "OK", retry = "Erneut versuchen", back = "Zurück", offline = "Offline – Änderungen werden nicht gespeichert",
        loading = "Lädt …", done = "Fertig", yes = "Ja", no = "Nein", owner = "Inhaber", staff = "Personal", refresh = "Aktualisieren", undo = "Rückgängig",
        added = { "$it gebucht" },
    ),
    errors = errorsDe,
)

val English = German.copy(
    code = "en",
    nav = Nav("Tabs", "Guests", "Overview", "History", "Settings"),
    login = Login(
        title = "Deckel", subtitle = "Sign in with your account from the website.", email = "Email", password = "Password",
        submit = "Sign in", busy = "One moment …", server = "Server",
    ),
    tabs = German.tabs.copy(
        open = "Open tabs", newTab = "New tab", search = "Search tabs", all = "All", withGuest = "Guests", walkIn = "Walk-ins",
        empty = "No open tabs", emptyHint = "Tap \"New tab\" when someone orders.", pickOne = "Pick a tab", pickHint = "Tap a tab on the left or open a new one.",
        since = { "since $it" }, drinksCount = { if (it == 1) "1 drink" else "$it drinks" }, table = "Table", noTable = "no table",
        payAsYouGo = "Pay as you go", payLater = "Pay later", payAsYouGoHint = "Each round is paid straight away", payLaterHint = "Runs a total, pay at the end",
        total = "Total", paid = "Paid", balance = "Owed", pay = "Take payment", putOnAccount = "Put on account", close = "Close tab", reopen = "Reopen",
        voidTab = "Void tab", round = "New round", roundEmpty = "Tap drinks on the right", book = "Book", bookAndPay = "Book & pay", clearRound = "Clear",
        repeatRound = "Same again", payments = "Payments", onHouse = "on the house", voided = "voided", rename = "Edit", label = "Name", note = "Note",
        linkGuest = "Link guest", unlinkGuest = "Unlink guest", newTabTitle = "New tab", forGuest = "For a guest", forWalkIn = "Walk-in",
        walkInLabel = "Name or description", walkInHint = "e.g. \"Stag party\" or \"Blue shirt\"", searchGuest = "Search guests …",
        createGuest = "Create new guest", openTab = "Open tab", goToTab = "Go to open tab", alreadyOpen = "has an open tab", closeConfirm = "Close this tab?",
        onAccountConfirm = { amount, name -> "Put $amount on $name's account?" }, voidConfirm = "Void the whole tab? Every drink will be voided.",
        soldOut = "out", owes = { "owes $it" }, by = { "by $it" }, modeTitle = "Payment", number = { "No. $it" }, closed = "Closed", onAccount = "On account",
        voidStatus = "Voided", categories = "Menu",
    ),
    pay = Pay(
        title = "Take payment", due = "Owed", amount = "Amount", tip = "Tip", noTip = "None", roundUp = "Round up", rest = "All", half = "Half",
        method = "Method", cash = "Cash", cardTerminal = "Card (terminal)", tapToPay = "Tap to Pay", other = "Other", given = "Given",
        change = { "Change: $it" }, confirm = { "Take $it" }, tapPrompt = "Hold card or phone to the tablet", tapWaiting = "Waiting for card …",
        tapProcessing = "Processing payment …", tapSuccess = "Paid!", tapCancel = "Cancel", simulated = "Test mode: simulated card reader",
        readerOffline = "Card reader not connected", settleTitle = "Settle debt", settleHint = { "Owed: $it. The oldest tab is settled first." },
        partial = "Part amount", methodOf = { it },
    ),
    item = ItemCopy(
        title = "Drink", qty = "Quantity", voidTitle = "Void", reasons = listOf("Mistyped", "Spilled", "Complaint", "Booked twice"),
        customReason = "Other reason", voidAction = "Void", onHouse = "On the house", charge = "Charge again",
        addedAt = { time, who -> "$time · $who" }, ownerOnly = "owner only", save = "Save",
    ),
    guests = Guests(
        title = "Guests", search = "Name, phone, email …", all = "All", regulars = "Regulars", owing = "Owing", empty = "No guests found",
        newGuest = "New guest", editGuest = "Edit guest", name = "Name", phone = "Phone", email = "Email", note = "Note (e.g. favourite drink)",
        regular = "Regular", creditLimit = "Credit limit (€)", creditHint = "0 = no limit. Only the owner can change it.", balance = "Owed",
        spent = "Spent", visits = "Visits", lastVisit = "Last visit", favourites = "Usually drinks", tabsHistory = "Tabs", settle = "Settle debt",
        archive = "Archive", openTab = "Open tab", goToTab = "Go to open tab", nothingOwed = "All paid", never = "never", pick = "Pick a guest",
        save = "Save", noFavourites = "No drinks yet", call = "Call",
    ),
    stats = StatsCopy(
        title = "Overview", today = "Today", yesterday = "Yesterday", week = "7 days", month = "30 days", revenue = "Revenue", tips = "Tips",
        payments = "Payments", openTabs = "Open tabs", onAccount = "On account", voids = "Voids", byHour = "Revenue by hour", byMethod = "By method",
        topDrinks = "Best sellers", noData = "No sales in this period yet.", guestsCount = { if (it == 1) "1 guest" else "$it guests" }, sold = { "$it×" },
    ),
    history = History(title = "History", today = "Today", empty = "No tabs were closed on this day.", pick = "Pick a tab", readOnly = "Closed – view only"),
    settings = Settings(
        title = "Settings", account = "Signed in as", role = { if (it == "owner") "Owner" else "Staff" }, language = "Language", reader = "Card payments",
        readerHint = "Tap to Pay: the tablet reads cards over NFC. The simulator is for testing without a real card.",
        readerTapToPay = "Tap to Pay (NFC)", readerSimulator = "Simulator (test)", readerOff = "Off", readerStatus = "Status", connect = "Connect",
        disconnect = "Disconnect", connected = { "Connected: $it" }, notConnected = "Not connected", connecting = "Connecting …", server = "Server",
        version = "Version", signOut = "Sign out", signOutConfirm = "Really sign out?",
        ttpUnsupported = "This device doesn't support Tap to Pay (needs NFC, Android 13+, not an emulator).",
    ),
    common = Common(
        cancel = "Cancel", save = "Save", ok = "OK", retry = "Retry", back = "Back", offline = "Offline – changes are not being saved", loading = "Loading …",
        done = "Done", yes = "Yes", no = "No", owner = "Owner", staff = "Staff", refresh = "Refresh", undo = "Undo", added = { "$it booked" },
    ),
    errors = errorsEn,
)

fun stringsFor(code: String) = if (code == "en") English else German

val LocalStrings = staticCompositionLocalOf { German }
