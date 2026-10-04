package com.paulanerroute66.deckel.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Login
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paulanerroute66.deckel.BuildConfig
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.UiState
import com.paulanerroute66.deckel.ui.components.PillButton
import com.paulanerroute66.deckel.ui.components.Segmented
import com.paulanerroute66.deckel.ui.components.LocalCompact
import com.paulanerroute66.deckel.ui.components.Shield
import com.paulanerroute66.deckel.ui.theme.Route66
import com.paulanerroute66.deckel.ui.theme.Rye

/* Asphalt with a neon glow, like the website's login: one account for website, portal and tablet. */
@Composable
fun LoginScreen(state: UiState, onLogin: (String, String) -> Unit, onLanguage: (String) -> Unit) {
    val strings = LocalStrings.current
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Route66.Chrome,
        unfocusedTextColor = Route66.Chrome,
        focusedBorderColor = Route66.Neon,
        unfocusedBorderColor = Route66.Chrome.copy(alpha = 0.25f),
        focusedLabelColor = Route66.Chrome,
        unfocusedLabelColor = Route66.Chrome.copy(alpha = 0.6f),
        cursorColor = Route66.Neon,
    )

    Box(
        Modifier
            .fillMaxSize()
            .background(Route66.Asphalt)
            .background(Brush.radialGradient(listOf(Route66.Neon.copy(alpha = 0.22f), Color.Transparent), radius = 1400f))
            .safeDrawingPadding()
            .imePadding(),
        contentAlignment = Alignment.Center,
    ) {
        Box(Modifier.align(Alignment.TopEnd).padding(24.dp).width(160.dp)) {
            Segmented(listOf("de" to "DE", "en" to "EN"), state.language, onLanguage, testTagPrefix = "lang", dark = true)
        }
        val compact = LocalCompact.current
        val brand: @Composable () -> Unit = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Shield(size = if (compact) 84.dp else 150.dp)
                Spacer(Modifier.height(if (compact) 12.dp else 24.dp))
                Text("Paulaner", fontFamily = Rye, fontSize = if (compact) 26.sp else 34.sp, color = Route66.Chrome)
                Text("meets Route 66", fontFamily = Rye, fontSize = if (compact) 20.sp else 26.sp, color = Route66.Neon)
            }
        }
        val form: @Composable () -> Unit = {
            Surface(shape = RoundedCornerShape(32.dp), color = Color.White.copy(alpha = 0.05f), modifier = Modifier.widthIn(max = 460.dp).fillMaxWidth()) {
                Column(Modifier.padding(if (compact) 24.dp else 36.dp)) {
                    Text(strings.login.title, fontFamily = Rye, fontSize = if (compact) 34.sp else 44.sp, color = Route66.Chrome)
                    Spacer(Modifier.height(6.dp))
                    Text(strings.login.subtitle, style = MaterialTheme.typography.bodyMedium, color = Route66.Chrome.copy(alpha = 0.65f))
                    Spacer(Modifier.height(28.dp))
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text(strings.login.email) },
                        singleLine = true,
                        colors = fieldColors,
                        shape = RoundedCornerShape(18.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth().testTag("login-email"),
                    )
                    Spacer(Modifier.height(14.dp))
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text(strings.login.password) },
                        singleLine = true,
                        colors = fieldColors,
                        shape = RoundedCornerShape(18.dp),
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { onLogin(email, password) }),
                        modifier = Modifier.fillMaxWidth().testTag("login-password"),
                    )
                    if (state.loginError != null) {
                        Spacer(Modifier.height(14.dp))
                        Text(state.loginError, color = Route66.Neon, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.testTag("login-error"))
                    }
                    Spacer(Modifier.height(24.dp))
                    PillButton(
                        if (state.loginBusy) strings.login.busy else strings.login.submit,
                        onClick = { onLogin(email, password) },
                        enabled = !state.loginBusy && email.isNotBlank() && password.isNotBlank(),
                        icon = Icons.Rounded.Login,
                        big = true,
                        modifier = Modifier.fillMaxWidth(),
                        testTag = "login-submit",
                    )
                    Spacer(Modifier.height(18.dp))
                    Text("${strings.login.server}: ${BuildConfig.API_URL.removePrefix("https://")} · Version ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.bodySmall, color = Route66.Chrome.copy(alpha = 0.4f))
                }
            }
        }
        if (compact) {
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(top = 72.dp, bottom = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                brand()
                Spacer(Modifier.height(24.dp))
                form()
            }
        } else Row(Modifier.padding(32.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(64.dp)) {
            brand()
            Box(Modifier.width(460.dp)) { form() }
        }
    }
}
