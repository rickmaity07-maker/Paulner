package com.paulanerroute66.deckel.data

import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Currency
import java.util.Locale

val BAR_ZONE: ZoneId = ZoneId.of("Europe/Berlin")

/* Euro amounts the way each language writes them: 3,50 € in German, €3.50 in English. */
object Money {
    private fun format(locale: Locale) = NumberFormat.getCurrencyInstance(locale).apply { currency = Currency.getInstance("EUR") }
    private val de = format(Locale.GERMANY)
    private val en = format(Locale.UK)

    fun format(cents: Int, language: String): String = (if (language == "en") en else de).format(cents / 100.0)

    /* Plain number for keypads and fields, without the € sign: "3,50" or "3.50". */
    fun plain(cents: Int, language: String): String {
        val whole = cents / 100
        val rest = (kotlin.math.abs(cents) % 100).toString().padStart(2, '0')
        return "$whole${if (language == "en") "." else ","}$rest"
    }

    /* Reads what staff type, accepting both comma and dot: "4", "4,5", "4.50" -> cents. Null when it isn't a price. */
    fun parse(input: String): Int? {
        val cleaned = input.trim().replace("€", "").replace(" ", "").replace(',', '.')
        if (cleaned.isEmpty()) return null
        if (!Regex("""^\d{1,5}(\.\d{0,2})?$""").matches(cleaned)) return null
        val parts = cleaned.split('.')
        val euros = parts[0].toInt()
        val cents = parts.getOrNull(1)?.padEnd(2, '0')?.take(2)?.toIntOrNull() ?: 0
        return euros * 100 + cents
    }

    /* Change to hand back for a cash payment. */
    fun change(givenCents: Int, dueCents: Int) = (givenCents - dueCents).coerceAtLeast(0)

    /* "Make it a round number": the next whole euro above the amount (or the amount itself if already round). */
    fun roundUp(cents: Int) = if (cents % 100 == 0) cents else (cents / 100 + 1) * 100
}

object Times {
    private val clock = DateTimeFormatter.ofPattern("HH:mm")

    fun clock(iso: String?): String = iso?.let { runCatching { clock.format(Instant.parse(it).atZone(BAR_ZONE)) }.getOrNull() } ?: ""

    fun today(): LocalDate = LocalDate.now(BAR_ZONE)

    fun minutesSince(iso: String, now: Instant = Instant.now()): Long =
        runCatching { java.time.Duration.between(Instant.parse(iso), now).toMinutes() }.getOrDefault(0)

    fun date(iso: String?, language: String, pattern: String = "EEE d. MMM"): String = iso?.let {
        runCatching {
            DateTimeFormatter.ofPattern(if (language == "en") pattern.replace("d.", "d") else pattern, if (language == "en") Locale.UK else Locale.GERMANY)
                .format(Instant.parse(it).atZone(BAR_ZONE))
        }.getOrNull()
    } ?: ""

    fun day(date: LocalDate, language: String): String =
        DateTimeFormatter.ofPattern(if (language == "en") "EEEE, d MMMM" else "EEEE, d. MMMM", if (language == "en") Locale.UK else Locale.GERMANY).format(date)
}
