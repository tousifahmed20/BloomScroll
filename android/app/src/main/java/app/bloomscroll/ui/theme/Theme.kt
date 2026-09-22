package app.bloomscroll.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// BloomScroll palette — a calm, growth-oriented green, deliberately NOT YouTube red.
private val Bloom = Color(0xFF2E7D5B)
private val BloomDark = Color(0xFF8BD4AE)

private val LightColors = lightColorScheme(primary = Bloom)
private val DarkColors = darkColorScheme(primary = BloomDark)

@Composable
fun BloomScrollTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
