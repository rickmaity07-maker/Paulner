package com.paulanerroute66.deckel.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/* Mirrors of the website's /api/app responses (lib/deckel.ts). Money is always integer cents. */

@Serializable
data class User(val id: String, val email: String, val name: String = "", val role: String) {
    val isOwner get() = role == "owner"
    val displayName get() = name.ifBlank { email.substringBefore('@') }
}

@Serializable
data class LoginResponse(val token: String, val user: User)

@Serializable
data class Drink(
    val id: String,
    val name: String,
    val notes: String = "",
    val notesEn: String = "",
    val size: String = "",
    val priceCents: Int,
    val image: String = "",
    val soldOut: Boolean = false,
    val featured: Boolean = false,
)

@Serializable
data class Category(val id: String, val label: String, val labelEn: String = "", val drinks: List<Drink>)

@Serializable
data class Venue(val name: String, val street: String = "", val city: String = "")

@Serializable
data class Bootstrap(
    val user: User,
    val venue: Venue,
    val categories: List<Category>,
    val updatedAt: String = "",
    val serverTime: String = "",
)

@Serializable
data class CustomerRef(val id: String, val name: String)

@Serializable
enum class TabMode {
    @SerialName("pay_as_you_go") PayAsYouGo,
    @SerialName("pay_later") PayLater,
}

@Serializable
enum class TabStatus {
    @SerialName("open") Open,
    @SerialName("closed") Closed,
    @SerialName("on_account") OnAccount,
    @SerialName("void") Void,
}

@Serializable
enum class PayMethod(val wire: String) {
    @SerialName("cash") Cash("cash"),
    @SerialName("card_terminal") CardTerminal("card_terminal"),
    @SerialName("tap_to_pay") TapToPay("tap_to_pay"),
    @SerialName("other") Other("other"),
}

@Serializable
data class TabItem(
    val id: String,
    val drinkId: String = "",
    val name: String,
    val size: String = "",
    val category: String = "",
    val unitPriceCents: Int,
    val qty: Int,
    val onHouse: Boolean = false,
    val addedAt: String,
    val addedBy: String = "",
    val voided: Boolean = false,
    val voidReason: String = "",
    val paidQty: Int = 0, // already paid for separately (split bill)
) {
    val lineCents get() = if (voided || onHouse) 0 else unitPriceCents * qty
    /* How many of this line a guest can still pay for on their own. */
    val payableQty get() = if (voided || onHouse) 0 else qty - paidQty
}

/* One drink a guest pays for when the table splits the bill. */
data class PaidItem(val itemId: String, val qty: Int)

@Serializable
data class Payment(
    val id: String,
    val tabId: String? = null,
    val amountCents: Int,
    val tipCents: Int = 0,
    val method: PayMethod,
    val takenAt: String,
    val takenBy: String = "",
    val refunded: Boolean = false,
    val note: String = "",
)

@Serializable
data class Tab(
    val id: String,
    val number: Int,
    val label: String,
    val table: String = "",
    val mode: TabMode = TabMode.PayLater,
    val status: TabStatus = TabStatus.Open,
    val note: String = "",
    val customer: CustomerRef? = null,
    val openedAt: String,
    val closedAt: String? = null,
    val openedBy: String = "",
    val totalCents: Int = 0,
    val paidCents: Int = 0,
    val balanceCents: Int = 0,
    val itemCount: Int = 0,
    val lastActivityAt: String = "",
    val items: List<TabItem> = emptyList(),
    val payments: List<Payment> = emptyList(),
)

@Serializable
data class TabList(val tabs: List<Tab>)

@Serializable
data class Favourite(val name: String, val size: String = "", val qty: Int)

@Serializable
data class Customer(
    val id: String,
    val name: String,
    val phone: String = "",
    val email: String = "",
    val note: String = "",
    val creditLimitCents: Int = 0,
    val regular: Boolean = false,
    val archived: Boolean = false,
    val createdAt: String = "",
    val balanceCents: Int = 0,
    val totalSpentCents: Int = 0,
    val visits: Int = 0,
    val lastVisitAt: String? = null,
    val openTabId: String? = null,
    val tabs: List<Tab> = emptyList(),
    val favourites: List<Favourite> = emptyList(),
    val payments: List<Payment> = emptyList(),
)

@Serializable
data class CustomerList(val customers: List<Customer>)

@Serializable
data class MethodTotal(val method: PayMethod, val amount: Int, val tips: Int = 0, val count: Int = 0)

@Serializable
data class TopDrink(val name: String, val size: String = "", val qty: Int, val revenue: Int)

@Serializable
data class HourTotal(val hour: Int, val amount: Int)

@Serializable
data class CountAmount(val count: Int = 0, val balanceCents: Int = 0)

@Serializable
data class Debts(val guests: Int = 0, val balanceCents: Int = 0)

@Serializable
data class Voids(val count: Int = 0, val amountCents: Int = 0)

@Serializable
data class Stats(
    val from: String,
    val to: String,
    val revenueCents: Int,
    val tipsCents: Int,
    val paymentCount: Int,
    val byMethod: List<MethodTotal>,
    val topDrinks: List<TopDrink>,
    val hourly: List<HourTotal>,
    val openTabs: CountAmount,
    val debts: Debts,
    val voids: Voids,
)

@Serializable
data class StripeToken(val secret: String, val location: String, val mode: String = "test")

@Serializable
data class StripeIntent(val id: String, val clientSecret: String? = null)

/* One line of a round being put together on the tablet, before it is booked. */
data class RoundLine(val drink: Drink, val qty: Int)
