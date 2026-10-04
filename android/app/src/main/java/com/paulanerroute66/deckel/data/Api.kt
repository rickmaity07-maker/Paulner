package com.paulanerroute66.deckel.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/* A refusal from the server ("tab_not_open", "credentials", ...) or a dead connection (code "offline"). */
class ApiException(val code: String, val status: Int, val detail: String? = null) : Exception(code)

/*
  The website's tablet API. Every call is a suspend function on the IO dispatcher;
  failures surface as ApiException with the server's machine-readable code.
*/
class Api(baseUrl: String, private val tokenProvider: () -> String?, client: OkHttpClient? = null) {
    private val base = baseUrl.trimEnd('/')
    private val http = client ?: OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(30, TimeUnit.SECONDS)
        .build()

    val json = Json { ignoreUnknownKeys = true; explicitNulls = false; coerceInputValues = true }
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    private suspend fun raw(method: String, path: String, body: JsonElement? = null, auth: Boolean = true): String =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder().url(base + path).header("Accept", "application/json")
            if (auth) tokenProvider()?.let { builder.header("Authorization", "Bearer $it") }
            val requestBody = body?.toString()?.toRequestBody(jsonType)
            builder.method(method, requestBody ?: if (method == "GET") null else "{}".toRequestBody(jsonType))
            val response = try {
                http.newCall(builder.build()).execute()
            } catch (e: IOException) {
                throw ApiException("offline", 0, e.message)
            }
            response.use {
                val text = it.body?.string().orEmpty()
                if (!it.isSuccessful) {
                    val parsed = runCatching { json.parseToJsonElement(text).jsonObject }.getOrNull()
                    throw ApiException(
                        parsed?.get("code")?.jsonPrimitive?.contentOrNull ?: "http_${it.code}",
                        it.code,
                        parsed?.get("message")?.jsonPrimitive?.contentOrNull,
                    )
                }
                text
            }
        }

    private suspend inline fun <reified T> get(path: String): T = json.decodeFromString(raw("GET", path))
    private suspend inline fun <reified T> send(method: String, path: String, body: JsonElement? = null): T =
        json.decodeFromString(raw(method, path, body))

    /* ---------- Session ---------- */

    suspend fun login(email: String, password: String): LoginResponse =
        json.decodeFromString(raw("POST", "/api/app/login", buildJsonObject { put("email", email); put("password", password) }, auth = false))

    suspend fun logout() {
        runCatching { raw("POST", "/api/app/logout") }
    }

    suspend fun bootstrap(): Bootstrap = get("/api/app/bootstrap")

    /* ---------- Tabs ---------- */

    suspend fun openTabs(): List<Tab> = get<TabList>("/api/app/tabs?status=open").tabs
    suspend fun onAccountTabs(): List<Tab> = get<TabList>("/api/app/tabs?status=on_account").tabs
    suspend fun closedTabs(date: String): List<Tab> = get<TabList>("/api/app/tabs?status=closed&date=$date").tabs
    suspend fun tab(id: String): Tab = get("/api/app/tabs/$id")

    suspend fun openTab(label: String, table: String, mode: TabMode, customerId: String?): Tab =
        send("POST", "/api/app/tabs", buildJsonObject {
            put("label", label)
            put("table", table)
            put("mode", if (mode == TabMode.PayAsYouGo) "pay_as_you_go" else "pay_later")
            customerId?.let { put("customerId", it) }
        })

    suspend fun updateTab(id: String, label: String? = null, table: String? = null, mode: TabMode? = null, note: String? = null, customerId: String? = null, clearCustomer: Boolean = false): Tab =
        send("PATCH", "/api/app/tabs/$id", buildJsonObject {
            label?.let { put("label", it) }
            table?.let { put("table", it) }
            note?.let { put("note", it) }
            mode?.let { put("mode", if (it == TabMode.PayAsYouGo) "pay_as_you_go" else "pay_later") }
            if (clearCustomer) put("customerId", JsonPrimitive(null as String?)) else customerId?.let { put("customerId", it) }
        })

    suspend fun addItems(tabId: String, lines: List<RoundLine>, payNow: PayMethod? = null, tipCents: Int = 0): Tab =
        send("POST", "/api/app/tabs/$tabId/items", buildJsonObject {
            put("items", buildJsonArray {
                lines.forEach { line -> add(buildJsonObject { put("drinkId", line.drink.id); put("qty", line.qty) }) }
            })
            payNow?.let { method -> put("payNow", buildJsonObject { put("method", method.wire); put("tipCents", tipCents) }) }
        })

    suspend fun voidItem(tabId: String, itemId: String, reason: String): Tab =
        send("PATCH", "/api/app/tabs/$tabId/items/$itemId", buildJsonObject { put("action", "void"); put("reason", reason) })

    suspend fun setOnHouse(tabId: String, itemId: String, onHouse: Boolean): Tab =
        send("PATCH", "/api/app/tabs/$tabId/items/$itemId", buildJsonObject { put("action", if (onHouse) "on_house" else "charge") })

    suspend fun setQty(tabId: String, itemId: String, qty: Int): Tab =
        send("PATCH", "/api/app/tabs/$tabId/items/$itemId", buildJsonObject { put("action", "qty"); put("qty", qty) })

    suspend fun pay(tabId: String, amountCents: Int, tipCents: Int, method: PayMethod, items: List<PaidItem>? = null, note: String = ""): Tab =
        send("POST", "/api/app/tabs/$tabId/payments", buildJsonObject {
            put("amountCents", amountCents); put("tipCents", tipCents); put("method", method.wire); put("note", note)
            items?.let { put("items", itemsJson(it)) }
        })

    private fun itemsJson(items: List<PaidItem>) = kotlinx.serialization.json.buildJsonArray {
        items.forEach { i -> add(buildJsonObject { put("itemId", i.itemId); put("qty", i.qty) }) }
    }

    suspend fun refund(paymentId: String): JsonObject = send("POST", "/api/app/payments/$paymentId/refund")

    suspend fun closeTab(tabId: String, action: String): Tab =
        send("POST", "/api/app/tabs/$tabId/close", buildJsonObject { put("action", action) })

    /* ---------- Guests ---------- */

    suspend fun customers(query: String = "", owing: Boolean = false): List<Customer> {
        val q = java.net.URLEncoder.encode(query, "UTF-8")
        return get<CustomerList>("/api/app/customers?q=$q${if (owing) "&owing=1" else ""}").customers
    }

    suspend fun customer(id: String): Customer = get("/api/app/customers/$id")

    suspend fun saveCustomer(id: String?, name: String, phone: String, email: String, note: String, regular: Boolean, creditLimitCents: Int?): Customer {
        val body = buildJsonObject {
            put("name", name); put("phone", phone); put("email", email); put("note", note); put("regular", regular)
            creditLimitCents?.let { put("creditLimitCents", it) }
        }
        return if (id == null) send("POST", "/api/app/customers", body) else send("PATCH", "/api/app/customers/$id", body)
    }

    suspend fun archiveCustomer(id: String, archived: Boolean): Customer =
        send("PATCH", "/api/app/customers/$id", buildJsonObject { put("archived", archived) })

    suspend fun settle(customerId: String, amountCents: Int, method: PayMethod): Customer =
        send("POST", "/api/app/customers/$customerId/settle", buildJsonObject { put("amountCents", amountCents); put("method", method.wire) })

    /* ---------- Figures ---------- */

    suspend fun stats(from: String, to: String): Stats = get("/api/app/stats?from=$from&to=$to")

    /* ---------- Updates ---------- */

    suspend fun updateInfo(current: Int): com.paulanerroute66.deckel.updates.UpdateInfo =
        json.decodeFromString(raw("GET", "/api/app/version?current=$current", auth = false))

    /* ---------- Stripe ---------- */

    suspend fun stripeToken(): StripeToken = send("POST", "/api/app/stripe/connection-token")

    suspend fun stripeIntent(tabId: String, amountCents: Int, tipCents: Int, items: List<PaidItem>? = null): StripeIntent =
        send("POST", "/api/app/stripe/payment-intent", buildJsonObject {
            put("tabId", tabId); put("amountCents", amountCents); put("tipCents", tipCents)
            items?.let { put("items", itemsJson(it)) }
        })

    suspend fun stripeRecord(paymentIntentId: String): Tab =
        send("POST", "/api/app/stripe/record", buildJsonObject { put("paymentIntentId", paymentIntentId) })
}
