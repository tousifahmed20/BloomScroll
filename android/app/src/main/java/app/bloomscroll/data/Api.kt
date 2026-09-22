package app.bloomscroll.data

import app.bloomscroll.BuildConfig
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface BloomScrollApi {
    @GET("themes")
    suspend fun getThemes(): List<Theme>

    @GET("themes/{id}/videos")
    suspend fun getFeed(
        @Path("id") themeId: Int,
        @Query("type") type: String? = null,   // "short" | "long" | null (all)
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int = 20,
    ): FeedResponse
}

object ApiClient {
    val api: BloomScrollApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(BloomScrollApi::class.java)
    }
}
