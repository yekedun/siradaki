import { ExpoConfig, ConfigContext } from 'expo/config';
import { withDangerousMod, withGradleProperties } from '@expo/config-plugins';
import fs from 'node:fs';
import path from 'node:path';

function replaceOnce(source: string, from: string, to: string): string {
  return source.includes(to) ? source : source.replace(from, to);
}

function addKotlinImport(source: string, importLine: string): string {
  return source.includes(importLine)
    ? source
    : source.replace('import android.os.Bundle', `import android.os.Bundle\n${importLine}`);
}

function withFramelessAndroidWindow(config: ExpoConfig): ExpoConfig {
  return withDangerousMod(config, ['android', async (cfg) => {
    const androidRoot = cfg.modRequest.platformProjectRoot;
    const stylesPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
    const mainActivityPath = path.join(
      androidRoot,
      'app',
      'src',
      'main',
      'java',
      'com',
      'siradaki',
      'app',
      'MainActivity.kt',
    );

    if (fs.existsSync(stylesPath)) {
      let styles = fs.readFileSync(stylesPath, 'utf8');
      styles = styles
        .replace(/\s*<item name="android:windowFullscreen">.*?<\/item>/g, '')
        .replace(/\s*<item name="android:windowLayoutInDisplayCutoutMode">.*?<\/item>/g, '')
        .replace(/\s*<item name="android:statusBarColor">.*?<\/item>/g, '');
      styles = styles.replace(
        '<item name="colorPrimary">@color/colorPrimary</item>',
        '<item name="colorPrimary">@color/colorPrimary</item>\n    <item name="android:windowFullscreen">true</item>\n    <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>\n    <item name="android:statusBarColor">#FBF8F1</item>',
      );
      fs.writeFileSync(stylesPath, styles);
    }

    if (fs.existsSync(mainActivityPath)) {
      let mainActivity = fs.readFileSync(mainActivityPath, 'utf8');
      mainActivity = addKotlinImport(mainActivity, 'import android.view.View');
      mainActivity = addKotlinImport(mainActivity, 'import android.view.WindowInsets');
      mainActivity = addKotlinImport(mainActivity, 'import android.view.WindowInsetsController');
      mainActivity = addKotlinImport(mainActivity, 'import android.view.WindowManager');
      mainActivity = replaceOnce(mainActivity, '    super.onCreate(null)', '    super.onCreate(null)\n    hideStatusBar()');
      mainActivity = replaceOnce(
        mainActivity,
        '\n  /**\n   * Returns the name of the main component registered from JavaScript. This is used to schedule\n',
        '\n  override fun onResume() {\n    super.onResume()\n    hideStatusBar()\n  }\n\n  override fun onWindowFocusChanged(hasFocus: Boolean) {\n    super.onWindowFocusChanged(hasFocus)\n    if (hasFocus) {\n      hideStatusBar()\n    }\n  }\n\n  private fun hideStatusBar() {\n    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {\n      val attrs = window.attributes\n      attrs.layoutInDisplayCutoutMode =\n        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES\n      window.attributes = attrs\n    }\n\n    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {\n      window.setDecorFitsSystemWindows(false)\n      window.insetsController?.systemBarsBehavior =\n        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE\n      window.insetsController?.hide(WindowInsets.Type.systemBars())\n    } else {\n      @Suppress("DEPRECATION")\n      window.decorView.systemUiVisibility =\n        window.decorView.systemUiVisibility or\n          View.SYSTEM_UI_FLAG_FULLSCREEN or\n          View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or\n          View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or\n          View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or\n          View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or\n          View.SYSTEM_UI_FLAG_LAYOUT_STABLE\n    }\n  }\n\n  /**\n   * Returns the name of the main component registered from JavaScript. This is used to schedule\n',
      );
      fs.writeFileSync(mainActivityPath, mainActivity);
    }

    return cfg;
  }]) as ExpoConfig;
}

const baseConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Sıradaki',
  slug: 'berber-randevu',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.siradaki.app',
    infoPlist: {
      NSUserNotificationUsageDescription:
        'Yeni randevu ve hatırlatma bildirimleri almak için izin gerekiyor.',
      NSContactsUsageDescription:
        'Rehberden müşteri seçerek telefon numarasını otomatik doldurmak için kişilere erişim gerekiyor.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.siradaki.app',
  },
  androidStatusBar: {
    hidden: true,
    translucent: true,
    backgroundColor: '#FBF8F1',
    barStyle: 'dark-content',
  },
  plugins: [
    'expo-router',
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
    'expo-secure-store',
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Montserrat-Regular.otf',
          './assets/fonts/Montserrat-Medium.otf',
          './assets/fonts/Montserrat-SemiBold.otf',
          './assets/fonts/Montserrat-Bold.otf',
        ],
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#1E3A8A',
        defaultChannel: 'default',
        sounds: [],
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: 'com.googleusercontent.apps.434882013340-odqk93o87gvag3j4u2ldbk5br0m34q0k',
      },
    ],
  ],
  scheme: 'siradaki',
  updates: {
    url: 'https://u.expo.dev/25ac450c-8b07-4703-805f-3d4fea1b8db7',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '25ac450c-8b07-4703-805f-3d4fea1b8db7',
    },
  },
});

export default (ctx: ConfigContext): ExpoConfig => {
  const cfg = withFramelessAndroidWindow(baseConfig(ctx));
  return withGradleProperties(cfg as any, (props) => {
    for (const item of props.modResults) {
      if (item.type !== 'property') continue;
      if (item.key === 'org.gradle.jvmargs') {
        item.value = '-Xmx4096m -XX:MaxMetaspaceSize=512m';
      }
      if (item.key === 'reactNativeArchitectures') {
        // Preview builds: arm64-v8a only (fast); production keeps all 4
        const arch = process.env.REACT_NATIVE_ARCHITECTURES;
        if (arch) item.value = arch;
      }
    }
    return props;
  }) as ExpoConfig;
};
