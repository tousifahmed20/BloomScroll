package app.bloomscroll.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.bloomscroll.data.ApiClient
import app.bloomscroll.data.Video
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class FeedState(
    val videos: List<Video> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null,
    val cursor: String? = null,
    val endReached: Boolean = false,
)

class FeedViewModel : ViewModel() {
    private val _state = MutableStateFlow(FeedState())
    val state: StateFlow<FeedState> = _state.asStateFlow()

    private var themeId: Int = -1
    private var type: String? = null

    fun start(themeId: Int, type: String?) {
        if (this.themeId == themeId && this.type == type && _state.value.videos.isNotEmpty()) return
        this.themeId = themeId
        this.type = type
        _state.value = FeedState()
        loadNext()
    }

    fun loadNext() {
        val s = _state.value
        if (s.loading || s.endReached) return
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val res = ApiClient.api.getFeed(themeId, type, s.cursor)
                _state.value = _state.value.copy(
                    videos = _state.value.videos + res.items,
                    cursor = res.nextCursor,
                    endReached = res.nextCursor == null,
                    loading = false,
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = e.message ?: "Failed to load")
            }
        }
    }
}
