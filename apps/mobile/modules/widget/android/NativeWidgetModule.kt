package com.berberapp.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native native module.
 * widget-bridge.ts içindeki pushTokenToWidget() çağrılarını karşılar.
 */
class NativeWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NativeWidgetModule"

    private val prefs: SharedPreferences
        get() = reactApplicationContext.getSharedPreferences(
            "berber_widget_prefs",
            Context.MODE_PRIVATE
        )

    /**
     * Widget token ve Supabase URL'yi SharedPreferences'a yazar.
     * AppWidget, BroadcastReceiver içinde bu değerleri okur.
     */
    @ReactMethod
    fun setWidgetToken(token: String, supabaseUrl: String, promise: Promise) {
        prefs.edit()
            .putString("widget_token", token)
            .putString("supabase_url", supabaseUrl)
            .apply()

        // Trigger widget refresh
        val context = reactApplicationContext
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(
            ComponentName(context, BarberWidgetProvider::class.java)
        )
        for (id in ids) {
            BarberWidgetProvider.updateWidget(context, manager, id)
        }

        promise.resolve(null)
    }
}
