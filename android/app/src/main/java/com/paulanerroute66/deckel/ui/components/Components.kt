package com.paulanerroute66.deckel.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Backspace
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paulanerroute66.deckel.data.Money
import com.paulanerroute66.deckel.i18n.LocalStrings
import com.paulanerroute66.deckel.ui.theme.GeistMono
import com.paulanerroute66.deckel.ui.theme.Route66
import com.paulanerroute66.deckel.ui.theme.Rye

/* The Route 66 shield from the website, drawn on a canvas so it stays crisp at any size. */
@Composable
fun Shield(modifier: Modifier = Modifier, size: Dp = 48.dp) {
    Box(modifier.size(width = size, height = size * 1.1f), contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            scale(this.size.width / 100f, this.size.height / 110f, pivot = Offset.Zero) {
                val outline = Path().apply {
                    moveTo(8f, 6f); lineTo(92f, 6f); cubicTo(92f, 13f, 89f, 18f, 84f, 21f); lineTo(91f, 36f)
                    cubicTo(97f, 70f, 78f, 91f, 50f, 104f); cubicTo(22f, 91f, 3f, 70f, 9f, 36f); lineTo(16f, 21f); cubicTo(11f, 18f, 8f, 13f, 8f, 6f); close()
                }
                drawPath(outline, Route66.Chrome)
                drawPath(outline, Route66.Asphalt, style = Stroke(width = 5f, join = StrokeJoin.Round))
                val band = Path().apply { moveTo(15f, 12f); lineTo(85f, 12f); cubicTo(84f, 16f, 82f, 19f, 79f, 21f); lineTo(21f, 21f); cubicTo(18f, 19f, 16f, 16f, 15f, 12f); close() }
                drawPath(band, Route66.Crimson)
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(top = size * 0.12f)) {
            Text("ROUTE", fontFamily = Rye, fontSize = (size.value * 0.13f).sp, color = Route66.Asphalt, lineHeight = (size.value * 0.15f).sp)
            Text("66", fontFamily = Rye, fontSize = (size.value * 0.4f).sp, color = Route66.Asphalt, lineHeight = (size.value * 0.42f).sp)
        }
    }
}

/* Amount in euros, formatted for the current language, in the monospaced face used for prices on the website. */
@Composable
fun MoneyText(cents: Int, modifier: Modifier = Modifier, fontSize: TextUnit = 17.sp, color: Color = Route66.Ink, weight: FontWeight = FontWeight.Medium, strike: Boolean = false) {
    val strings = LocalStrings.current
    Text(
        Money.format(cents, strings.code),
        modifier = modifier,
        fontFamily = GeistMono,
        fontSize = fontSize,
        fontWeight = weight,
        color = color,
        style = if (strike) TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough) else TextStyle.Default,
    )
}

@Composable
fun Eyebrow(text: String, modifier: Modifier = Modifier, color: Color = Route66.Blue) {
    Text(text.uppercase(), modifier = modifier, style = MaterialTheme.typography.labelMedium, color = color)
}

enum class ButtonKind { Primary, Dark, Secondary, Ghost, GhostLight, Danger, Blue }

/* Pill buttons like the website's CTAs, with a press-down squash. */
@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    kind: ButtonKind = ButtonKind.Primary,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    big: Boolean = false,
    testTag: String? = null,
) {
    val (bg, fg, border) = when (kind) {
        ButtonKind.Primary -> Triple(Route66.Crimson, Route66.Chrome, Color.Transparent)
        ButtonKind.Dark -> Triple(Route66.Asphalt, Route66.Chrome, Color.Transparent)
        ButtonKind.Blue -> Triple(Route66.Blue, Route66.Chrome, Color.Transparent)
        ButtonKind.Secondary -> Triple(Color.White, Route66.Ink, Route66.Ink.copy(alpha = 0.15f))
        ButtonKind.Ghost -> Triple(Color.Transparent, Route66.Ink, Color.Transparent)
        ButtonKind.GhostLight -> Triple(Color.Transparent, Route66.Chrome, Route66.Chrome.copy(alpha = 0.3f))
        ButtonKind.Danger -> Triple(Color.White, Route66.Crimson, Route66.Crimson.copy(alpha = 0.35f))
    }
    val alpha by animateFloatAsState(if (enabled) 1f else 0.4f, label = "alpha")
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = bg.copy(alpha = bg.alpha * alpha),
        contentColor = fg.copy(alpha = alpha),
        border = if (border.alpha > 0f) androidx.compose.foundation.BorderStroke(1.dp, border) else null,
        modifier = modifier.then(if (testTag != null) Modifier.testTag(testTag) else Modifier),
    ) {
        Row(
            Modifier.padding(horizontal = if (big) 18.dp else 16.dp, vertical = if (big) 18.dp else 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(if (big) 22.dp else 18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(text, style = if (big) MaterialTheme.typography.titleMedium else MaterialTheme.typography.labelLarge, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
        }
    }
}

/* Segmented choice, e.g. pay-as-you-go vs pay-later, DE/EN. */
@Composable
fun <T> Segmented(options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit, modifier: Modifier = Modifier, testTagPrefix: String = "seg", dark: Boolean = false) {
    Row(
        modifier.clip(CircleShape).background(if (dark) Route66.Chrome.copy(alpha = 0.1f) else Route66.Ink.copy(alpha = 0.06f)).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        options.forEach { (value, label) ->
            val active = value == selected
            val bg by animateColorAsState(if (active) Route66.Crimson else Color.Transparent, label = "seg")
            Box(
                Modifier
                    .weight(1f)
                    .clip(CircleShape)
                    .background(bg)
                    .clickable(role = Role.RadioButton) { onSelect(value) }
                    .testTag("$testTagPrefix-$value")
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(label, style = MaterialTheme.typography.labelLarge, color = if (active || dark) Route66.Chrome.copy(alpha = if (active) 1f else 0.7f) else Route66.Ink.copy(alpha = 0.7f), maxLines = 1)
            }
        }
    }
}

@Composable
fun FilterChip(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, count: Int? = null) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = if (selected) Route66.Asphalt else Color.White,
        contentColor = if (selected) Route66.Chrome else Route66.Ink,
        border = if (selected) null else androidx.compose.foundation.BorderStroke(1.dp, Route66.Ink.copy(alpha = 0.12f)),
        modifier = modifier,
    ) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(text, style = MaterialTheme.typography.labelLarge)
            if (count != null) {
                Spacer(Modifier.width(6.dp))
                Text("$count", style = MaterialTheme.typography.labelLarge, color = if (selected) Route66.Chrome.copy(alpha = 0.6f) else Route66.Muted)
            }
        }
    }
}

@Composable
fun Badge(text: String, color: Color, modifier: Modifier = Modifier, onColor: Color = Route66.Chrome) {
    Box(modifier.clip(CircleShape).background(color).padding(horizontal = 10.dp, vertical = 4.dp)) {
        Text(text.uppercase(), style = MaterialTheme.typography.labelSmall, color = onColor, maxLines = 1)
    }
}

/* Initials in a coloured circle; the colour follows the name so a guest always looks the same. */
@Composable
fun Avatar(name: String, modifier: Modifier = Modifier, size: Dp = 40.dp) {
    val palette = listOf(Route66.Crimson, Route66.Blue, Route66.Green, Route66.Gold, Route66.Asphalt)
    val initials = name.split(' ', '-').filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() }.ifEmpty { "?" }
    Box(
        modifier.size(size).clip(CircleShape).background(palette[(name.hashCode() and 0x7fffffff) % palette.size]),
        contentAlignment = Alignment.Center,
    ) {
        Text(initials, color = Route66.Chrome, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.38f).sp)
    }
}

@Composable
fun Card(modifier: Modifier = Modifier, padding: PaddingValues = PaddingValues(20.dp), content: @Composable () -> Unit) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(24.dp),
        color = Route66.Card,
        border = androidx.compose.foundation.BorderStroke(1.dp, Route66.Ink.copy(alpha = 0.06f)),
        shadowElevation = 1.dp,
    ) { Box(Modifier.padding(padding)) { content() } }
}

@Composable
fun EmptyState(title: String, hint: String, modifier: Modifier = Modifier, showShield: Boolean = true) {
    Column(modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        if (showShield) {
            Box(Modifier.scale(1f)) { Shield(size = 64.dp) }
            Spacer(Modifier.height(20.dp))
        }
        Text(title, style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center, color = Route66.Ink)
        Spacer(Modifier.height(8.dp))
        Text(hint, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center, color = Route66.Muted)
    }
}

@Composable
fun OfflineBanner(visible: Boolean) {
    val strings = LocalStrings.current
    AnimatedVisibility(visible, enter = expandVertically(), exit = shrinkVertically()) {
        Row(
            Modifier.fillMaxWidth().background(Route66.Gold).padding(horizontal = 20.dp, vertical = 10.dp).testTag("offline-banner"),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.CloudOff, contentDescription = null, tint = Route66.Asphalt)
            Spacer(Modifier.width(10.dp))
            Text(strings.common.offline, color = Route66.Asphalt, style = MaterialTheme.typography.titleSmall)
        }
    }
}

/* Big-key number pad for amounts; each key is a full thumb wide. */
@Composable
fun Keypad(onKey: (String) -> Unit, modifier: Modifier = Modifier, decimal: String = ",") {
    val rows = listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf(decimal, "0", "⌫"))
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { key ->
                    Surface(
                        onClick = { onKey(if (key == "⌫") "back" else if (key == decimal) "." else key) },
                        shape = RoundedCornerShape(16.dp),
                        color = Color.White,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Route66.Ink.copy(alpha = 0.08f)),
                        modifier = Modifier.weight(1f).aspectRatio(1.9f).testTag("key-$key"),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            if (key == "⌫") Icon(Icons.AutoMirrored.Rounded.Backspace, contentDescription = "Delete", tint = Route66.Ink)
                            else Text(key, fontFamily = GeistMono, fontSize = 26.sp, fontWeight = FontWeight.Medium, color = Route66.Ink)
                        }
                    }
                }
            }
        }
    }
}

/* Applies one keypad press to an amount being typed, keeping at most two decimals. */
fun applyKey(current: String, key: String): String = when {
    key == "back" -> current.dropLast(1)
    key == "." -> if (current.contains('.')) current else (current.ifEmpty { "0" } + ".")
    current.contains('.') && current.substringAfter('.').length >= 2 -> current
    current == "0" -> key
    current.replace(".", "").length >= 6 -> current
    else -> current + key
}

@Composable
fun Stat(label: String, value: String, modifier: Modifier = Modifier, sub: String? = null, accent: Color = Route66.Ink) {
    Card(modifier, padding = PaddingValues(18.dp)) {
        Column {
            Eyebrow(label, color = Route66.Muted)
            Spacer(Modifier.height(10.dp))
            Text(value, fontFamily = Rye, fontSize = if (value.length > 9) 22.sp else 30.sp, color = accent, maxLines = 1, softWrap = false)
            if (sub != null) {
                Spacer(Modifier.height(4.dp))
                Text(sub, style = MaterialTheme.typography.bodySmall, color = Route66.Muted)
            }
        }
    }
}

@Composable
fun Divider(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(Route66.Ink.copy(alpha = 0.08f)))
}

@Composable
fun DashedDivider(modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxWidth().height(2.dp)) {
        var x = 0f
        while (x < size.width) {
            drawLine(Route66.Ink.copy(alpha = 0.18f), Offset(x, 1f), Offset((x + 10f).coerceAtMost(size.width), 1f), strokeWidth = 2f)
            x += 18f
        }
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier, trailing: @Composable (() -> Unit)? = null) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = MaterialTheme.typography.headlineSmall, color = Route66.Ink, modifier = Modifier.weight(1f))
        trailing?.invoke()
    }
}

@Composable
fun BorderedBox(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(modifier.clip(RoundedCornerShape(18.dp)).border(1.dp, Route66.Ink.copy(alpha = 0.1f), RoundedCornerShape(18.dp))) { content() }
}
