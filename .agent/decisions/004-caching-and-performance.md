# Status

ACCEPTED

# Context

The public booking flow needs lower server load and smoother client behavior without sacrificing freshness where Realtime already provides updates.

# Decision

Use `unstable_cache` with a 60 second TTL for repeated profile reads, apply `Cache-Control: s-maxage=30, stale-while-revalidate=60` to the availability API, and favor timestamp arithmetic inside slot loops to reduce repeated `Date` allocation.

# Consequences

- Initial loads are cheaper while live changes still come from Realtime.
- Cached behavior must be considered when debugging stale page data.
- Performance assumptions should be revisited if booking volume or data shape changes.
