package app.bloomscroll.ui.player

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.YouTubePlayer
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.AbstractYouTubePlayerListener
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.views.YouTubePlayerView

/**
 * Plays a video via YouTube's official IFrame player (wrapped by the
 * android-youtube-player library). This is the compliant playback path — we
 * never extract streams or use a custom player.
 *
 * @param autoPlay when true the visible item starts automatically (Shorts feed).
 */
@Composable
fun YouTubePlayer(
    videoId: String,
    modifier: Modifier = Modifier,
    autoPlay: Boolean = false,
) {
    val lifecycleOwner = LocalLifecycleOwner.current

    AndroidView(
        modifier = modifier,
        factory = { context ->
            YouTubePlayerView(context).apply {
                lifecycleOwner.lifecycle.addObserver(this)
                addYouTubePlayerListener(object : AbstractYouTubePlayerListener() {
                    override fun onReady(youTubePlayer: YouTubePlayer) {
                        if (autoPlay) youTubePlayer.loadVideo(videoId, 0f)
                        else youTubePlayer.cueVideo(videoId, 0f)
                    }
                })
            }
        },
    )
}
