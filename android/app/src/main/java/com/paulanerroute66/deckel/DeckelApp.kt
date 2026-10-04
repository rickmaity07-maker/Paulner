package com.paulanerroute66.deckel

import android.app.Application
import com.paulanerroute66.deckel.data.Api
import com.paulanerroute66.deckel.data.SessionStore
import com.paulanerroute66.deckel.payments.CardReader
import com.stripe.stripeterminal.TerminalApplicationDelegate
import java.util.concurrent.Executors

/* The few long-lived objects the app shares: saved session, the website API, the card reader. */
class Container(app: Application) {
    val session = SessionStore(app)
    val api = Api(BuildConfig.API_URL, tokenProvider = { session.token })
    val reader = CardReader(app, api)
    val updater = com.paulanerroute66.deckel.updates.Updater(app, api)
}

class DeckelApp : Application() {
    lateinit var container: Container
        private set

    override fun onCreate() {
        super.onCreate()
        /*
          Tap to Pay runs a second, locked-down copy of the app in the ":stripetaptopay"
          process; nothing of ours belongs there. We check the process name directly:
          Stripe's TapToPay.isInTapToPayProcess() gives the same answer but loads the
          secure payment module first, which froze startup for seconds.
        */
        if (getProcessName().endsWith(":stripetaptopay")) return
        container = Container(this)
        // Stripe's lifecycle hook is likewise heavy; it only matters once a card payment starts.
        Executors.newSingleThreadExecutor().execute { runCatching { TerminalApplicationDelegate.onCreate(this) } }
    }
}
