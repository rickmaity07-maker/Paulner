package com.paulanerroute66.deckel

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.paulanerroute66.deckel.ui.App
import com.paulanerroute66.deckel.ui.AppViewModel
import com.paulanerroute66.deckel.ui.Phase
import com.paulanerroute66.deckel.ui.theme.DeckelTheme

class MainActivity : ComponentActivity() {
    private val viewModel: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        // The shield stays on screen until the saved sign-in has been read.
        installSplashScreen().setKeepOnScreenCondition { viewModel.state.value.phase == Phase.Loading }
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Android 13+: ask once, so "Update available" can appear in the notification bar.
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) {}.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        setContent { DeckelTheme { App(viewModel) } }
    }
}
