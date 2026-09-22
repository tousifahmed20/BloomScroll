package app.bloomscroll.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import app.bloomscroll.data.Video
import app.bloomscroll.ui.player.YouTubePlayer
import coil.compose.AsyncImage

private enum class Mode(val label: String, val apiType: String) {
    Shorts("Shorts", "short"),
    Long("Long-form", "long"),
}

@Composable
fun FeedScreen(themeId: Int, vm: FeedViewModel = viewModel()) {
    var mode by remember { mutableStateOf(Mode.Shorts) }
    // Re-key the ViewModel query when the mode changes.
    LaunchedEffectMode(themeId, mode, vm)
    val state by vm.state.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Mode.values().forEach { m ->
                FilterChip(
                    selected = mode == m,
                    onClick = { mode = m },
                    label = { Text(m.label) },
                )
            }
        }

        when (mode) {
            Mode.Shorts -> ShortsPager(state.videos, onNearEnd = vm::loadNext)
            Mode.Long -> LongList(state.videos, onNearEnd = vm::loadNext)
        }
    }
}

@Composable
private fun LaunchedEffectMode(themeId: Int, mode: Mode, vm: FeedViewModel) {
    androidx.compose.runtime.LaunchedEffect(themeId, mode) {
        vm.start(themeId, mode.apiType)
    }
}

@Composable
private fun ShortsPager(videos: List<Video>, onNearEnd: () -> Unit) {
    if (videos.isEmpty()) return
    val pagerState = rememberPagerState(pageCount = { videos.size })

    VerticalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
        val video = videos[page]
        Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            // TODO: pause off-screen players; here we autoplay the current page only.
            YouTubePlayer(
                videoId = video.id,
                autoPlay = page == pagerState.currentPage,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (page >= videos.size - 3) onNearEnd()
    }
}

@Composable
private fun LongList(videos: List<Video>, onNearEnd: () -> Unit) {
    var playingId by remember { mutableStateOf<String?>(null) }

    Column(Modifier.fillMaxSize()) {
        playingId?.let { id ->
            YouTubePlayer(
                videoId = id,
                autoPlay = true,
                modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
            )
            TextButton(onClick = { playingId = null }) { Text("Close player") }
        }

        LazyColumn(Modifier.fillMaxSize()) {
            itemsIndexed(videos) { index, video ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .clickable { playingId = video.id },
                ) {
                    AsyncImage(
                        model = video.thumbnail_url,
                        contentDescription = video.title,
                        modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
                    )
                    Text(
                        text = video.title,
                        style = MaterialTheme.typography.titleSmall,
                        modifier = Modifier.padding(12.dp),
                    )
                }
                if (index >= videos.size - 3) onNearEnd()
            }
        }
    }
}
