/**
 * Expo Config Plugin: Berber Widget (iOS WidgetKit + Android AppWidget)
 *
 * `expo prebuild` sırasında çalışır:
 *   - Android: Manifest'e widget receiver'ları ekler, build.gradle'a OkHttp bağımlılığını ekler
 *   - iOS: App Group entitlement ekler, NativeWidgetModule.swift/.m'i Xcode target'a kopyalar
 *
 * NOT: WidgetKit extension target'ını otomatik eklemek (300+ satır xcodeproj
 * manipülasyonu gerektirir) bu skeleton'da YOK. `expo prebuild` sonrası
 * Xcode'da manuel adım gerekir (README.md'de açıklanmıştır):
 *   1. File > New > Target > Widget Extension → "BarberWidget"
 *   2. App Group entitlement ekle (group.com.berberapp)
 *   3. modules/widget/ios/BarberWidget.swift'i target'a ekle
 *
 * Yine de bu plugin Android tarafının %100'ünü ve iOS bridging modülünü otomatize eder.
 */

const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withEntitlementsPlist,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_GROUP = "group.com.berberapp";

// ─────────────────────────────────────────────
// Android: Manifest'e receiver'lar ekle
// ─────────────────────────────────────────────
function withWidgetAndroidManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return cfg;

    application.receiver = application.receiver ?? [];

    // BarberWidgetProvider
    if (
      !application.receiver.find(
        (r) => r.$["android:name"] === "com.berberapp.widget.BarberWidgetProvider"
      )
    ) {
      application.receiver.push({
        $: {
          "android:name": "com.berberapp.widget.BarberWidgetProvider",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/barber_widget_info",
            },
          },
        ],
      });
    }

    // BlockActionReceiver
    if (
      !application.receiver.find(
        (r) => r.$["android:name"] === "com.berberapp.widget.BlockActionReceiver"
      )
    ) {
      application.receiver.push({
        $: {
          "android:name": "com.berberapp.widget.BlockActionReceiver",
          "android:exported": "false",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "com.berberapp.BLOCK_WALKIN" } }],
          },
        ],
      });
    }

    return cfg;
  });
}

// ─────────────────────────────────────────────
// Android: build.gradle'a OkHttp ekle
// ─────────────────────────────────────────────
function withWidgetAndroidGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    const okhttp = `implementation("com.squareup.okhttp3:okhttp:4.12.0")`;
    const coroutines = `implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")`;

    if (!cfg.modResults.contents.includes(okhttp)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*{/,
        `dependencies {\n    ${okhttp}\n    ${coroutines}`
      );
    }

    return cfg;
  });
}

// ─────────────────────────────────────────────
// Android: Kotlin kaynaklarını + res/ dosyalarını kopyala
// ─────────────────────────────────────────────
function withWidgetAndroidSources(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const srcDir = path.join(cfg.modRequest.projectRoot, "modules/widget/android");
      const javaDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app/src/main/java/com/berberapp/widget"
      );
      const resDir = path.join(cfg.modRequest.platformProjectRoot, "app/src/main/res");

      fs.mkdirSync(javaDir, { recursive: true });

      // Kotlin dosyaları
      for (const file of [
        "BarberWidgetProvider.kt",
        "BlockActionReceiver.kt",
        "NativeWidgetModule.kt",
        "BarberWidgetPackage.kt",
      ]) {
        const from = path.join(srcDir, file);
        if (fs.existsSync(from)) {
          fs.copyFileSync(from, path.join(javaDir, file));
        }
      }

      // res/ alt-klasörlerini birleştir
      copyDir(path.join(srcDir, "res"), resDir);

      return cfg;
    },
  ]);
}

// ─────────────────────────────────────────────
// Android: MainApplication.kt'ye BarberWidgetPackage register et
// ─────────────────────────────────────────────
function withWidgetAndroidPackageRegister(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const candidates = [
        "app/src/main/java/com/berberapp/MainApplication.kt",
        "app/src/main/java/com/berberapp/MainApplication.java",
      ];
      let target = null;
      for (const c of candidates) {
        const p = path.join(cfg.modRequest.platformProjectRoot, c);
        if (fs.existsSync(p)) { target = p; break; }
      }
      if (!target) {
        console.warn("[withBarberWidget] MainApplication not found — skipping package register");
        return cfg;
      }

      let src = fs.readFileSync(target, "utf8");
      const isKotlin = target.endsWith(".kt");

      const importLine = isKotlin
        ? "import com.berberapp.widget.BarberWidgetPackage"
        : "import com.berberapp.widget.BarberWidgetPackage;";

      // Import ekle (yoksa)
      if (!src.includes("BarberWidgetPackage")) {
        // Son `import` satırından sonraya ekle
        src = src.replace(
          /((?:^|\n)import [^\n]+\n)(?!.*^import)/s,
          `$1${importLine}\n`
        );
      }

      // getPackages() listesine ekle
      // Kotlin: PackageList(this).packages.apply { add(BarberWidgetPackage()) }
      // Java:   List<ReactPackage> packages = new PackageList(this).getPackages(); packages.add(new BarberWidgetPackage());
      if (!src.includes("BarberWidgetPackage()")) {
        if (isKotlin) {
          src = src.replace(
            /(PackageList\(this\)\.packages)/,
            "$1.apply { add(BarberWidgetPackage()) }"
          );
          // Eğer .apply zaten varsa (örn. `.packages.apply { ... }`), o bloğa ekle
          if (!src.includes("BarberWidgetPackage()")) {
            src = src.replace(
              /(PackageList\(this\)\.packages\.apply\s*\{)/,
              "$1\n          add(BarberWidgetPackage())"
            );
          }
        } else {
          // Java
          src = src.replace(
            /(List<ReactPackage>\s+packages\s*=\s*new\s+PackageList\(this\)\.getPackages\(\);)/,
            "$1\n      packages.add(new BarberWidgetPackage());"
          );
        }
      }

      fs.writeFileSync(target, src, "utf8");
      return cfg;
    },
  ]);
}

// ─────────────────────────────────────────────
// iOS: App Group entitlement ekle
// ─────────────────────────────────────────────
function withWidgetIosEntitlements(config) {
  return withEntitlementsPlist(config, (cfg) => {
    const groups = cfg.modResults["com.apple.security.application-groups"] ?? [];
    if (!groups.includes(APP_GROUP)) {
      groups.push(APP_GROUP);
    }
    cfg.modResults["com.apple.security.application-groups"] = groups;
    return cfg;
  });
}

// ─────────────────────────────────────────────
// iOS: NativeWidgetModule.swift + .m'i kopyala
// (WidgetKit extension target manuel — bkz. plugin başındaki not)
// ─────────────────────────────────────────────
function withWidgetIosSources(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const srcDir = path.join(cfg.modRequest.projectRoot, "modules/widget/ios");
      const iosProjectName = cfg.modRequest.projectName ?? "berberrandevu";
      const destDir = path.join(cfg.modRequest.platformProjectRoot, iosProjectName);

      for (const file of ["NativeWidgetModule.swift", "NativeWidgetModule.m"]) {
        const from = path.join(srcDir, file);
        if (fs.existsSync(from)) {
          fs.copyFileSync(from, path.join(destDir, file));
        }
      }

      return cfg;
    },
  ]);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

// ─────────────────────────────────────────────
// Plugin entry
// ─────────────────────────────────────────────
module.exports = function withBarberWidget(config) {
  config = withWidgetAndroidManifest(config);
  config = withWidgetAndroidGradle(config);
  config = withWidgetAndroidSources(config);
  config = withWidgetAndroidPackageRegister(config);
  config = withWidgetIosEntitlements(config);
  config = withWidgetIosSources(config);
  return config;
};
