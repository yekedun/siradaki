import Foundation
import WidgetKit

/// Expo native module — React Native tarafından çağrılır.
/// widget-bridge.ts içindeki pushTokenToWidget() bu modülü kullanır.
///
/// Widget extension EXPO_PUBLIC_* environment variable'larına erişemez,
/// bu yüzden Supabase URL'yi de UserDefaults'a yazıyoruz.
@objc(NativeWidgetModule)
class NativeWidgetModule: NSObject {
    private let APP_GROUP = "group.com.berberapp"

    /// Widget token + Supabase URL'yi App Group UserDefaults'a yazar.
    /// WidgetKit extension aynı App Group'tan okur.
    @objc func setWidgetToken(_ token: String,
                               supabaseUrl: String,
                               resolver: @escaping RCTPromiseResolveBlock,
                               rejecter: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: APP_GROUP) else {
            rejecter("APP_GROUP_ERROR", "App Group bulunamadı: \(APP_GROUP)", nil)
            return
        }
        defaults.set(token, forKey: "widget_token")
        defaults.set(supabaseUrl, forKey: "supabase_url")
        defaults.synchronize()

        // Reload widget timeline
        WidgetCenter.shared.reloadAllTimelines()
        resolver(nil)
    }

    @objc static func requiresMainQueueSetup() -> Bool { false }
}
