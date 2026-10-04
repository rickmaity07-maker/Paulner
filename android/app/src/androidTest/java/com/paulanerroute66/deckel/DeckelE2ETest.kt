package com.paulanerroute66.deckel

import android.graphics.Bitmap
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters
import java.io.File

/*
  The whole shift on the real app, against the test server (debug build with
  -PapiUrl=http://10.0.2.2:3100 and the test database). Steps run in order and
  share the server's state; each leaves a screenshot in the app's files/e2e folder.

  Accounts on the test database: staff.test@paulaner.local / Staff-Test-2026
*/
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class DeckelE2ETest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    private val run = System.getProperty("e2e.run") ?: RUN_ID
    private val walkIn = "Stammtisch $run"
    private val quick = "Theke $run"
    private val guest = "Klaus $run"

    /* ---------- helpers ---------- */

    private fun pause(ms: Long = 450) = Thread.sleep(ms)

    private fun waitTag(tag: String, timeout: Long = 20_000): SemanticsNodeInteraction {
        rule.waitUntilAtLeastOneExists(hasTestTag(tag), timeout)
        return rule.onNodeWithTag(tag)
    }

    private fun waitText(text: String, timeout: Long = 20_000) = rule.waitUntilAtLeastOneExists(hasText(text, substring = true), timeout)

    private fun tap(tag: String) {
        waitTag(tag).performClick()
        pause()
    }

    private fun type(tag: String, text: String) {
        waitTag(tag).performTextClearance()
        rule.onNodeWithTag(tag).performTextInput(text)
        pause(250)
    }

    private fun balanceIs(amount: String) {
        rule.waitUntil(20_000) {
            runCatching { rule.onNodeWithTag("tab-balance", useUnmergedTree = true).assertTextContains(amount, substring = true) }.isSuccess
        }
    }

    private fun shot(name: String) {
        pause(700)
        val bitmap = InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot() ?: return
        val dir = File(InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null), "e2e").apply { mkdirs() }
        File(dir, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 90, it) }
    }

    private fun signedIn() {
        if (rule.onAllNodes(hasTestTag("nav-tabs")).fetchSemanticsNodes().isEmpty()) {
            waitTag("login-email")
            type("login-email", "staff.test@paulaner.local")
            type("login-password", "Staff-Test-2026")
            tap("login-submit")
            waitTag("nav-tabs")
        }
    }

    private fun addDrink(tag: String, times: Int = 1) = repeat(times) { tap(tag) }

    private fun openWalkIn(label: String, table: String, payAsYouGo: Boolean = false) {
        tap("nav-tabs")
        tap("new-tab")
        type("newtab-label", label)
        type("newtab-table", table)
        if (payAsYouGo) tap("newtab-mode-PayAsYouGo")
        tap("newtab-open")
        waitText(label)
    }

    /* ---------- the shift ---------- */

    @Test fun t01_wrongPasswordIsRefused() {
        waitTag("login-email")
        shot("01-login")
        type("login-email", "staff.test@paulaner.local")
        type("login-password", "falsch")
        tap("login-submit")
        waitTag("login-error")
        shot("02-login-error")
    }

    @Test fun t02_staffSignsIn() {
        signedIn()
        waitTag("new-tab")
        shot("03-tabs-empty")
    }

    @Test fun t03_payLaterTabWithRoundsVoidAndRepeat() {
        signedIn()
        openWalkIn(walkIn, "7")
        // Round one: 2 Pils + 1 Helles = 11,00 €
        addDrink("drink-Paulaner Pils-0,4 l", 2)
        addDrink("drink-Paulaner Helles-0,5 l")
        waitTag("round-panel")
        shot("04-round")
        tap("round-book")
        balanceIs("11,00")
        // Same again: another 11,00 €
        tap("round-repeat")
        tap("round-book")
        balanceIs("22,00")
        // Take one Helles back
        rule.onAllNodes(hasTestTag("item-Paulaner Helles"))[0].performClick()
        waitTag("item-dialog")
        shot("05-item-dialog")
        tap("item-void")
        balanceIs("18,00")
        shot("06-tab-after-void")
    }

    @Test fun t04_payInCashAndClose() {
        signedIn()
        tap("tab-card-$walkIn")
        balanceIs("18,00")
        tap("tab-pay")
        waitTag("pay-dialog")
        shot("07-payment")
        tap("pay-confirm")
        balanceIs("0,00")
        tap("tab-close")
        tap("confirm-ok")
        rule.waitUntil(20_000) { rule.onAllNodes(hasTestTag("tab-card-$walkIn")).fetchSemanticsNodes().isEmpty() }
        shot("08-closed")
    }

    @Test fun t05_payAsYouGoRound() {
        signedIn()
        openWalkIn(quick, "Theke", payAsYouGo = true)
        addDrink("drink-Paulaner Radler-0,5 l", 2)
        tap("round-book-pay")
        waitTag("pay-dialog")
        tap("pay-confirm")
        balanceIs("0,00")
        shot("09-pay-as-you-go")
        tap("tab-close")
        tap("confirm-ok")
    }

    @Test fun t06_guestRunsATabOnAccountAndSettles() {
        signedIn()
        tap("nav-guests")
        tap("guest-new")
        type("guest-form-name", guest)
        type("guest-form-phone", "+49 9721 4711")
        type("guest-form-note", "Trinkt Pils")
        tap("guest-form-regular")
        tap("guest-form-save")
        waitText(guest)
        shot("10-guest-profile")
        tap("guest-open-tab")
        waitTag("tab-title")
        addDrink("drink-Paulaner Pils-0,4 l", 3)
        tap("round-book")
        balanceIs("10,50")
        tap("tab-on-account")
        tap("confirm-ok")
        pause(1200)
        tap("nav-guests")
        type("guest-search", guest)
        tap("guest-row-$guest")
        waitText("10,50")
        shot("11-guest-owes")
        tap("guest-settle")
        waitTag("settle-dialog")
        tap("settle-confirm")
        rule.waitUntil(20_000) { rule.onAllNodes(hasTestTag("settle-dialog")).fetchSemanticsNodes().isEmpty() }
        waitText("0,00")
        shot("12-guest-settled")
    }

    @Test fun t07_figuresShowTheNight() {
        signedIn()
        tap("nav-stats")
        waitTag("stat-revenue")
        waitText("Paulaner Pils")
        shot("13-stats")
    }

    @Test fun t08_historyListsClosedTabs() {
        signedIn()
        tap("nav-history")
        waitText(walkIn)
        waitText(quick)
        shot("14-history")
    }

    @Test fun t09_switchToEnglishAndBack() {
        signedIn()
        tap("nav-settings")
        tap("settings-lang-en")
        waitText("Overview")
        shot("15-settings-english")
        tap("nav-tabs")
        waitText("New tab")
        shot("16-tabs-english")
        tap("nav-settings")
        tap("settings-lang-de")
        waitText("Übersicht")
    }

    companion object {
        private val RUN_ID = (System.currentTimeMillis() / 1000 % 100000).toString()
    }
}
