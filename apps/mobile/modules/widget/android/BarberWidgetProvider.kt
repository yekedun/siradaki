package com.berberapp.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.berberapp.R

class BarberWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.barber_widget)

            // 30 dk blok butonu
            views.setOnClickPendingIntent(
                R.id.btn_block_30,
                buildBlockPendingIntent(context, widgetId, 30)
            )

            // 60 dk blok butonu
            views.setOnClickPendingIntent(
                R.id.btn_block_60,
                buildBlockPendingIntent(context, widgetId, 60)
            )

            appWidgetManager.updateAppWidget(widgetId, views)
        }

        private fun buildBlockPendingIntent(
            context: Context,
            widgetId: Int,
            durationMin: Int
        ): PendingIntent {
            val intent = Intent(context, BlockActionReceiver::class.java).apply {
                action = "com.berberapp.BLOCK_WALKIN"
                putExtra("duration_min", durationMin)
                putExtra("widget_id", widgetId)
            }
            return PendingIntent.getBroadcast(
                context,
                widgetId * 1000 + durationMin, // unique request code
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}
