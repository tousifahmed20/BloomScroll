package app.bloomscroll.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument

@Composable
fun AppNav() {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "picker") {
        composable("picker") {
            ThemePickerScreen(onThemeClick = { themeId -> nav.navigate("feed/$themeId") })
        }
        composable(
            route = "feed/{themeId}",
            arguments = listOf(navArgument("themeId") { type = NavType.IntType }),
        ) { entry ->
            val themeId = entry.arguments?.getInt("themeId") ?: return@composable
            FeedScreen(themeId = themeId)
        }
    }
}
