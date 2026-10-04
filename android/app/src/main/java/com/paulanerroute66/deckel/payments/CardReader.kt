package com.paulanerroute66.deckel.payments

import android.content.Context
import com.paulanerroute66.deckel.data.Api
import com.paulanerroute66.deckel.data.ApiException
import com.paulanerroute66.deckel.data.Tab
import com.stripe.stripeterminal.Terminal
import com.stripe.stripeterminal.external.callable.Callback
import com.stripe.stripeterminal.external.callable.Cancelable
import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider
import com.stripe.stripeterminal.external.callable.DiscoveryListener
import com.stripe.stripeterminal.external.callable.InternetReaderListener
import com.stripe.stripeterminal.external.callable.OfflineListener
import com.stripe.stripeterminal.external.callable.PaymentIntentCallback
import com.stripe.stripeterminal.external.callable.ReaderCallback
import com.stripe.stripeterminal.external.callable.TapToPayReaderListener
import com.stripe.stripeterminal.external.callable.TerminalListener
import com.stripe.stripeterminal.external.models.CollectPaymentIntentConfiguration
import com.stripe.stripeterminal.external.models.ConfirmPaymentIntentConfiguration
import com.stripe.stripeterminal.external.models.ConnectionConfiguration
import com.stripe.stripeterminal.external.models.ConnectionTokenException
import com.stripe.stripeterminal.external.models.DiscoveryConfiguration
import com.stripe.stripeterminal.external.models.OfflineStatus
import com.stripe.stripeterminal.external.models.PaymentIntent
import com.stripe.stripeterminal.external.models.Reader
import com.stripe.stripeterminal.external.models.TerminalException
import com.stripe.stripeterminal.log.LogLevel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/*
  Card payments through Stripe Terminal.

    tap_to_pay  the tablet itself reads contactless cards and phones over NFC
                (real devices only: NFC, Android 13+, Google Play, not an emulator)
    simulator   Stripe's simulated reader, for testing the whole flow without a card
    off         card payments by Stripe disabled; cash and the bar's own terminal still work

  Every amount is checked by the website before Stripe sees it, and a payment
  only lands on the tab after the website has confirmed it with Stripe.
*/
enum class ReaderMode(val wire: String) { TapToPay("tap_to_pay"), Simulator("simulator"), Off("off");
    companion object { fun of(wire: String) = entries.firstOrNull { it.wire == wire } ?: Off }
}

sealed interface ReaderState {
    data object Off : ReaderState
    data object Connecting : ReaderState
    data class Connected(val label: String, val simulated: Boolean) : ReaderState
    data class Failed(val message: String) : ReaderState
}

sealed interface PaymentStep {
    data object Preparing : PaymentStep
    data object WaitingForCard : PaymentStep
    data object Processing : PaymentStep
}

class CardReader(private val context: Context, private val api: Api) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val _state = MutableStateFlow<ReaderState>(ReaderState.Off)
    val state: StateFlow<ReaderState> = _state
    private var locationId: String? = null
    private var discovery: Cancelable? = null
    private var activePayment: Cancelable? = null

    private fun ensureInitialized() {
        if (Terminal.isInitialized()) return
        Terminal.init(
            context.applicationContext,
            LogLevel.WARNING,
            object : ConnectionTokenProvider {
                override fun fetchConnectionToken(callback: ConnectionTokenCallback) {
                    scope.launch {
                        try {
                            val token = api.stripeToken()
                            locationId = token.location
                            callback.onSuccess(token.secret)
                        } catch (e: ApiException) {
                            callback.onFailure(ConnectionTokenException(e.code, e))
                        }
                    }
                }
            },
            object : TerminalListener {},
            object : OfflineListener {
                override fun onOfflineStatusChange(offlineStatus: OfflineStatus) = Unit
                override fun onPaymentIntentForwarded(paymentIntent: PaymentIntent, e: TerminalException?) = Unit
                override fun onForwardingFailure(e: TerminalException) = Unit
            },
        )
    }

    suspend fun connect(mode: ReaderMode) {
        if (mode == ReaderMode.Off) return disconnect()
        _state.value = ReaderState.Connecting
        try {
            ensureInitialized()
            Terminal.getInstance().connectedReader?.let { disconnectQuietly() }
            if (locationId == null) locationId = api.stripeToken().location
            val reader = discoverFirst(mode)
            val connected = connectTo(reader, mode)
            _state.value = ReaderState.Connected(connected.label ?: connected.serialNumber ?: "Reader", mode == ReaderMode.Simulator)
        } catch (e: ApiException) {
            _state.value = ReaderState.Failed(e.code)
        } catch (e: TerminalException) {
            _state.value = ReaderState.Failed(e.errorCode.name.lowercase())
        } catch (e: Exception) {
            _state.value = ReaderState.Failed(e.message ?: "reader")
        }
    }

    private suspend fun discoverFirst(mode: ReaderMode): Reader = suspendCancellableCoroutine { cont ->
        val config: DiscoveryConfiguration = when (mode) {
            ReaderMode.TapToPay -> DiscoveryConfiguration.TapToPayDiscoveryConfiguration(isSimulated = false)
            else -> DiscoveryConfiguration.InternetDiscoveryConfiguration(location = locationId, isSimulated = true)
        }
        var delivered = false
        discovery = Terminal.getInstance().discoverReaders(
            config,
            object : DiscoveryListener {
                override fun onUpdateDiscoveredReaders(readers: List<Reader>) {
                    val first = readers.firstOrNull() ?: return
                    if (!delivered) {
                        delivered = true
                        cont.resume(first)
                    }
                }
            },
            object : Callback {
                override fun onSuccess() = Unit
                override fun onFailure(e: TerminalException) {
                    if (!delivered) {
                        delivered = true
                        cont.resumeWithException(e)
                    }
                }
            },
        )
        cont.invokeOnCancellation { discovery?.cancel(NoopCallback) }
    }

    private suspend fun connectTo(reader: Reader, mode: ReaderMode): Reader = suspendCancellableCoroutine { cont ->
        val location = locationId ?: ""
        val config: ConnectionConfiguration = when (mode) {
            ReaderMode.TapToPay -> ConnectionConfiguration.TapToPayConnectionConfiguration(location, true, object : TapToPayReaderListener {})
            else -> ConnectionConfiguration.InternetConnectionConfiguration(object : InternetReaderListener {}, false)
        }
        Terminal.getInstance().connectReader(reader, config, object : ReaderCallback {
            override fun onSuccess(reader: Reader) = cont.resume(reader)
            override fun onFailure(e: TerminalException) = cont.resumeWithException(e)
        })
    }

    suspend fun disconnect() {
        disconnectQuietly()
        _state.value = ReaderState.Off
    }

    private suspend fun disconnectQuietly() {
        if (!Terminal.isInitialized() || Terminal.getInstance().connectedReader == null) return
        suspendCancellableCoroutine { cont ->
            Terminal.getInstance().disconnectReader(object : Callback {
                override fun onSuccess() = cont.resume(Unit)
                override fun onFailure(e: TerminalException) = cont.resume(Unit)
            })
        }
    }

    /*
      Takes a card payment for a tab: the website creates the PaymentIntent (and
      checks the amount), the reader collects and confirms it, and the website
      records it after verifying with Stripe. Returns the updated tab.
    */
    suspend fun charge(tabId: String, amountCents: Int, tipCents: Int, items: List<com.paulanerroute66.deckel.data.PaidItem>? = null, onStep: (PaymentStep) -> Unit): Tab {
        if (_state.value !is ReaderState.Connected) throw ApiException("reader_offline", 0)
        onStep(PaymentStep.Preparing)
        val intent = api.stripeIntent(tabId, amountCents, tipCents, items)
        val secret = intent.clientSecret ?: throw ApiException("payment_intent_invalid", 0)
        val retrieved = suspendCancellableCoroutine<PaymentIntent> { cont ->
            Terminal.getInstance().retrievePaymentIntent(secret, object : PaymentIntentCallback {
                override fun onSuccess(paymentIntent: PaymentIntent) = cont.resume(paymentIntent)
                override fun onFailure(e: TerminalException) = cont.resumeWithException(e)
            })
        }
        onStep(PaymentStep.WaitingForCard)
        val processed: PaymentIntent = try {
            suspendCancellableCoroutine<PaymentIntent> { cont ->
                activePayment = Terminal.getInstance().processPaymentIntent(
                    retrieved,
                    CollectPaymentIntentConfiguration.Builder().build(),
                    ConfirmPaymentIntentConfiguration.Builder().build(),
                    object : PaymentIntentCallback {
                        override fun onSuccess(paymentIntent: PaymentIntent) = cont.resume(paymentIntent)
                        override fun onFailure(e: TerminalException) = cont.resumeWithException(e)
                    },
                )
                cont.invokeOnCancellation { activePayment?.cancel(NoopCallback) }
            }
        } catch (e: TerminalException) {
            throw ApiException(if (e.errorCode.name.contains("CANCEL")) "payment_canceled" else "reader", 0, e.errorMessage)
        } finally {
            activePayment = null
        }
        onStep(PaymentStep.Processing)
        return api.stripeRecord(processed.id ?: intent.id)
    }

    fun cancelPayment() {
        activePayment?.cancel(NoopCallback)
    }

    private object NoopCallback : Callback {
        override fun onSuccess() = Unit
        override fun onFailure(e: TerminalException) = Unit
    }
}
