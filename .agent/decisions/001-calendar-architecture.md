# Status

ACCEPTED

# Context

The booking system needs a shared availability model across web, mobile, and Supabase edge functions. Timezone handling and slot generation must stay consistent across every surface.

# Decision

Use `@berber/shared` as the single source of truth through Deno `import_map.json`, with slot logic centralized in `packages/shared/src/slot-utils.ts`. Keep `working_hours` in JSONB and use `Intl.DateTimeFormat`-based timezone helpers for DST-safe slot computation.

# Consequences

- Web, mobile, and edge functions consume the same scheduling rules.
- Shared package imports must keep `.ts` extensions for Deno compatibility.
- Changes to slot behavior now have a larger blast radius and require careful validation.
