import WidgetKit
import SwiftUI
import AppIntents

// ─────────────────────────────────────────────
// MARK: - Timeline Entry
// ─────────────────────────────────────────────
struct BarberWidgetEntry: TimelineEntry {
    let date: Date
    let nextBlockEndsAt: Date?   // nil = müsait
}

// ─────────────────────────────────────────────
// MARK: - App Group Key
// ─────────────────────────────────────────────
private let APP_GROUP = "group.com.berberapp"
private let TOKEN_KEY  = "widget_token"
private let SUPABASE_URL_KEY = "supabase_url"

// ─────────────────────────────────────────────
// MARK: - Timeline Provider
// ─────────────────────────────────────────────
struct BarberWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> BarberWidgetEntry {
        BarberWidgetEntry(date: Date(), nextBlockEndsAt: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (BarberWidgetEntry) -> Void) {
        completion(BarberWidgetEntry(date: Date(), nextBlockEndsAt: nil))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BarberWidgetEntry>) -> Void) {
        let entry = BarberWidgetEntry(date: Date(), nextBlockEndsAt: nil)
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// ─────────────────────────────────────────────
// MARK: - AppIntents (iOS 17+ interactive widget)
// ─────────────────────────────────────────────
struct BlockWalkinIntent: AppIntent {
    static var title: LocalizedStringResource = "Yürüyerek Gelen Müşteriyi Engelle"
    static var description = IntentDescription("Belirtilen süre kadar yeni randevu almayı engeller.")

    @Parameter(title: "Süre (dakika)", default: 60)
    var durationMin: Int

    func perform() async throws -> some IntentResult {
        guard let defaults = UserDefaults(suiteName: APP_GROUP),
              let token = defaults.string(forKey: TOKEN_KEY),
              let supabaseURL = defaults.string(forKey: SUPABASE_URL_KEY),
              !token.isEmpty else {
            throw WidgetError.tokenNotFound
        }

        let url = URL(string: "\(supabaseURL)/functions/v1/block-walkin")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(
            withJSONObject: ["duration_min": durationMin, "reason": "walkin"]
        )
        request.timeoutInterval = 10

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw WidgetError.requestFailed
        }

        // Reload widget timeline to reflect the new block
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

enum WidgetError: Error, LocalizedError {
    case tokenNotFound
    case requestFailed

    var errorDescription: String? {
        switch self {
        case .tokenNotFound: return "Widget token bulunamadı. Uygulamadan token oluşturun."
        case .requestFailed:  return "Blok eklenemedi. Bağlantınızı kontrol edin."
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Views
// ─────────────────────────────────────────────
struct BarberWidgetSmallView: View {
    var entry: BarberWidgetEntry

    var body: some View {
        VStack(spacing: 8) {
            Text("Berber")
                .font(.caption2)
                .foregroundColor(.secondary)

            // iOS 17+: Button with AppIntent
            if #available(iOS 17.0, *) {
                Button(intent: BlockWalkinIntent(durationMin: 60)) {
                    VStack(spacing: 4) {
                        Image(systemName: "person.fill.xmark")
                            .font(.title2)
                        Text("1 Saat\nEngelle")
                            .font(.caption2)
                            .multilineTextAlignment(.center)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
            } else {
                // iOS 16 fallback: deeplink
                Link(destination: URL(string: "berberapp://block?duration=60")!) {
                    VStack(spacing: 4) {
                        Image(systemName: "person.fill.xmark")
                            .font(.title2)
                            .foregroundColor(.red)
                        Text("1 Saat\nEngelle")
                            .font(.caption2)
                            .multilineTextAlignment(.center)
                    }
                }
            }
        }
        .padding()
    }
}

struct BarberWidgetMediumView: View {
    var entry: BarberWidgetEntry

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Berber Takvimi")
                    .font(.headline)
                Text(entry.nextBlockEndsAt == nil ? "Müsait" : "Meşgul")
                    .font(.subheadline)
                    .foregroundColor(entry.nextBlockEndsAt == nil ? .green : .red)
            }
            Spacer()

            if #available(iOS 17.0, *) {
                VStack(spacing: 8) {
                    Button(intent: BlockWalkinIntent(durationMin: 30)) {
                        Text("30 dk")
                            .font(.callout)
                            .fontWeight(.semibold)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)

                    Button(intent: BlockWalkinIntent(durationMin: 60)) {
                        Text("1 saat")
                            .font(.callout)
                            .fontWeight(.semibold)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                }
            } else {
                VStack(spacing: 8) {
                    Link("30 dk", destination: URL(string: "berberapp://block?duration=30")!)
                    Link("1 saat", destination: URL(string: "berberapp://block?duration=60")!)
                }
            }
        }
        .padding()
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Entry Point
// ─────────────────────────────────────────────
struct BarberWidget: Widget {
    let kind = "BarberWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BarberWidgetProvider()) { entry in
            BarberWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Berber Blocker")
        .description("Yürüyerek gelen müşteriler için hızlı zaman engeli.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct BarberWidgetEntryView: View {
    var entry: BarberWidgetEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            BarberWidgetSmallView(entry: entry)
        default:
            BarberWidgetMediumView(entry: entry)
        }
    }
}
