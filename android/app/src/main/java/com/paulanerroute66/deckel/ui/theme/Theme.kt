package com.paulanerroute66.deckel.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paulanerroute66.deckel.R

/* The website's tokens (app/globals.css), one to one. */
object Route66 {
    val Cream = Color(0xFFF3E7DA)      // night: page background
    val Paper = Color(0xFFEAD9C6)      // moss: deeper paper
    val Sunken = Color(0xFFE0CAB3)     // fern
    val Ink = Color(0xFF1F1A19)        // bone: text
    val Muted = Color(0xFF6D605A)      // sage
    val Crimson = Color(0xFFB3203A)    // amber: the accent
    val CrimsonDark = Color(0xFF8F1A2F)
    val Blue = Color(0xFF1F78AD)       // route
    val Asphalt = Color(0xFF171415)
    val Chrome = Color(0xFFF6EFE6)
    val Neon = Color(0xFFFF3D5E)
    val Gold = Color(0xFFE8A33A)
    val Green = Color(0xFF1E7A4F)
    val Card = Color(0xFFFFFBF6)
}

private fun geist(weight: Int) = Font(R.font.geist, FontWeight(weight), variationSettings = FontVariation.Settings(FontVariation.weight(weight)))
private fun mono(weight: Int) = Font(R.font.geist_mono, FontWeight(weight), variationSettings = FontVariation.Settings(FontVariation.weight(weight)))

val Rye = FontFamily(Font(R.font.rye))
val Geist = FontFamily(geist(400), geist(500), geist(600), geist(700))
val GeistMono = FontFamily(mono(400), mono(500), mono(600))

private val typography = Typography(
    displayLarge = TextStyle(fontFamily = Rye, fontSize = 56.sp, lineHeight = 60.sp, color = Route66.Ink),
    displayMedium = TextStyle(fontFamily = Rye, fontSize = 40.sp, lineHeight = 46.sp),
    displaySmall = TextStyle(fontFamily = Rye, fontSize = 30.sp, lineHeight = 36.sp),
    headlineLarge = TextStyle(fontFamily = Rye, fontSize = 28.sp, lineHeight = 34.sp),
    headlineMedium = TextStyle(fontFamily = Rye, fontSize = 24.sp, lineHeight = 30.sp),
    headlineSmall = TextStyle(fontFamily = Rye, fontSize = 20.sp, lineHeight = 26.sp),
    titleLarge = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = 17.sp, lineHeight = 22.sp),
    titleSmall = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = Geist, fontSize = 17.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = Geist, fontSize = 15.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontFamily = Geist, fontSize = 13.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, letterSpacing = 0.4.sp),
    labelMedium = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, letterSpacing = 1.6.sp),
    labelSmall = TextStyle(fontFamily = Geist, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, letterSpacing = 1.4.sp),
)

private val colors = lightColorScheme(
    primary = Route66.Crimson,
    onPrimary = Route66.Chrome,
    primaryContainer = Color(0xFFF6D9DE),
    onPrimaryContainer = Route66.CrimsonDark,
    secondary = Route66.Blue,
    onSecondary = Route66.Chrome,
    secondaryContainer = Color(0xFFD5E7F2),
    onSecondaryContainer = Color(0xFF0E4A6E),
    tertiary = Route66.Gold,
    background = Route66.Cream,
    onBackground = Route66.Ink,
    surface = Route66.Card,
    onSurface = Route66.Ink,
    surfaceVariant = Route66.Paper,
    onSurfaceVariant = Route66.Muted,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Route66.Card,
    surfaceContainer = Route66.Card,
    surfaceContainerHigh = Route66.Card,
    surfaceContainerHighest = Route66.Paper,
    outline = Color(0x331F1A19),
    outlineVariant = Color(0x1A1F1A19),
    error = Route66.Crimson,
    inverseSurface = Route66.Asphalt,
    inverseOnSurface = Route66.Chrome,
)

private val shapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

@Composable
fun DeckelTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = typography, shapes = shapes, content = content)
}
