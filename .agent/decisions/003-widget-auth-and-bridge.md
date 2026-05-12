# Status

ACCEPTED

# Context

The widget runs outside the main app runtime and cannot rely on normal Expo public environment access or token refresh behavior.

# Decision

Authenticate widget actions with SHA256-hashed stored tokens rather than JWTs. Keep the native widget bridge signature as `setWidgetToken(token, url)` so the native layers can persist both token and Supabase URL.

# Consequences

- Widget auth remains stable across iOS and Android native contexts.
- Raw widget tokens must never be stored.
- Native bridge changes require coordinated updates across TypeScript, Swift, Objective-C bridge, and Kotlin.
