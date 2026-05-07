package com.berberapp.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class BlockActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val durationMin = intent.getIntExtra("duration_min", 60)

        // Token, React Native tarafından SharedPreferences'a yazılır (NativeWidgetModule.kt)
        val prefs = context.getSharedPreferences("berber_widget_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("widget_token", "") ?: ""
        val supabaseUrl = prefs.getString("supabase_url", "") ?: ""

        if (token.isEmpty() || supabaseUrl.isEmpty()) {
            android.util.Log.w("BarberWidget", "Widget token veya Supabase URL eksik")
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(10, TimeUnit.SECONDS)
                    .build()

                val body = """{"duration_min":$durationMin,"reason":"walkin"}"""
                    .toRequestBody("application/json".toMediaType())

                val request = Request.Builder()
                    .url("$supabaseUrl/functions/v1/block-walkin")
                    .post(body)
                    .header("Authorization", "Bearer $token")
                    .header("Content-Type", "application/json")
                    .build()

                val response = client.newCall(request).execute()
                if (!response.isSuccessful) {
                    android.util.Log.e(
                        "BarberWidget",
                        "Blok eklenemedi: ${response.code} ${response.body?.string()}"
                    )
                }
                response.close()
            } catch (e: Exception) {
                android.util.Log.e("BarberWidget", "Blok isteği hatası: ${e.message}")
            }
        }
    }
}
