/**
 * React Native NativeModules köprüsü.
 *
 * Native taraf:
 *   - iOS: modules/widget/ios/NativeWidgetModule.swift (+ .m bridging)
 *   - Android: modules/widget/android/NativeWidgetModule.kt
 *
 * Her iki platform da aynı imzayı destekler:
 *   setWidgetToken(token: string, supabaseUrl: string): Promise<void>
 *
 * widget-bridge.ts bu interface üzerinden native koda erişir.
 */
import { NativeModules } from "react-native";

interface IWidgetModule {
  setWidgetToken(token: string, supabaseUrl: string): Promise<void>;
}

const nativeModule = (NativeModules as { NativeWidgetModule?: IWidgetModule })
  .NativeWidgetModule;

/**
 * Native modül bulunamazsa (Expo Go'da, ya da prebuild yapılmamışsa) sessiz no-op döner.
 * Geliştirme sırasında widget özelliği çalışmaz ama uygulama çökmez.
 */
export const NativeWidgetModule: IWidgetModule = nativeModule ?? {
  setWidgetToken: async () => {
    console.warn(
      "[NativeWidgetModule] Native modül yüklenmedi. " +
        "Bu özellik için `expo prebuild` ve dev build gerekli (Expo Go yetersiz)."
    );
  },
};

export const isWidgetModuleAvailable = nativeModule !== undefined;
