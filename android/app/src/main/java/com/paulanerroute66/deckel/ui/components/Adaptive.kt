package com.paulanerroute66.deckel.ui.components

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.theme.Route66

/*
  True on a phone (narrower than 600 dp, Android's "compact" width). Screens then
  show one pane at a time instead of side by side, and stack what sits in rows.
*/
val LocalCompact = staticCompositionLocalOf { false }

/* Phone-only back arrow above a detail pane; the system back gesture does the same. */
@Composable
fun BackBar(onBack: () -> Unit, modifier: Modifier = Modifier, trailing: @Composable () -> Unit = {}) {
    BackHandler(onBack = onBack)
    Row(modifier.padding(start = 4.dp, end = 12.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack, modifier = Modifier.testTag("back")) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = LocalStrings.current.common.back, tint = Route66.Ink)
        }
        trailing()
    }
}
