package com.paulanerroute66.deckel

import com.paulanerroute66.deckel.data.Money
import com.paulanerroute66.deckel.data.RoundLine
import com.paulanerroute66.deckel.data.Drink
import com.paulanerroute66.deckel.data.TabItem
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.applyKey
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MoneyTest {
    @Test fun formatsGermanAndEnglish() {
        assertEquals("3,50 €", Money.format(350, "de").replace(' ', ' '))
        assertEquals("€3.50", Money.format(350, "en"))
        assertEquals("1.234,00 €", Money.format(123400, "de").replace(' ', ' '))
    }

    @Test fun parsesWhatStaffType() {
        assertEquals(350, Money.parse("3,50"))
        assertEquals(350, Money.parse("3.5"))
        assertEquals(400, Money.parse("4"))
        assertEquals(1205, Money.parse(" 12,05 € "))
        assertNull(Money.parse(""))
        assertNull(Money.parse("abc"))
        assertNull(Money.parse("1,234"))
    }

    @Test fun changeAndRoundUp() {
        assertEquals(150, Money.change(2000, 1850))
        assertEquals(0, Money.change(1000, 1850))
        assertEquals(1900, Money.roundUp(1850))
        assertEquals(2000, Money.roundUp(2000))
    }

    @Test fun plainKeepsTwoDecimals() {
        assertEquals("3,05", Money.plain(305, "de"))
        assertEquals("0.50", Money.plain(50, "en"))
    }

    @Test fun keypadBuildsAmounts() {
        var v = ""
        listOf("1", "8", ".", "5", "0", "9").forEach { v = applyKey(v, it) }
        assertEquals("18.50", v) // a third decimal is ignored
        v = applyKey(v, "back")
        assertEquals("18.5", v)
        assertEquals("0.", applyKey("", "."))
        assertEquals("7", applyKey("0", "7"))
        assertEquals("3.", applyKey("3.", "."))
    }

    @Test fun lineTotalsIgnoreVoidedAndOnHouse() {
        val base = TabItem(id = "1", name = "Pils", unitPriceCents = 350, qty = 3, addedAt = "2026-10-04T18:00:00Z")
        assertEquals(1050, base.lineCents)
        assertEquals(0, base.copy(voided = true).lineCents)
        assertEquals(0, base.copy(onHouse = true).lineCents)
    }

    @Test fun roundTotal() {
        val pils = Drink(id = "p", name = "Pils", priceCents = 350)
        val helles = Drink(id = "h", name = "Helles", priceCents = 400)
        val state = UiState(round = listOf(RoundLine(pils, 2), RoundLine(helles, 1)))
        assertEquals(1100, state.roundCents)
    }
}
