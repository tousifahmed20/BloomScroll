package app.bloomscroll.data

data class Theme(
    val id: Int,
    val name: String,
    val slug: String,
)

data class Video(
    val id: String,
    val title: String,
    val duration_sec: Int,
    val content_type: String, // "short" | "long"
    val thumbnail_url: String,
    val published_at: String?,
    val channel_title: String?,
)

data class FeedResponse(
    val items: List<Video>,
    val nextCursor: String?,
)
