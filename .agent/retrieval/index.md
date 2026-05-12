# Retrieval Index

Use retrieval folders for topic-based context:

- `static/` for docs, API references, and long-lived references
- `dynamic/` for temporary research, experiments, and benchmarks
- `supabase/` for schema, migrations, edge functions, auth, and Realtime notes
- `nextjs/` for app router, data fetching, caching, and route behavior notes
- `ui/` for agenda flows, component behavior, and interaction decisions
- `references/` for external patterns, snippets, and general supporting material
- `references/project-notes.md` for durable project reminders and blockers

Retrieval rule:

- retrieval is not memory
- every retrieval file should include metadata
- every important file should declare priority
- store docs, examples, and supporting references here
- keep volatile material in `dynamic/`
- keep stable material in `static/`

Use agent state files for live coordination:

- Rules: `AGENT_RULES.md`
- Bootstrap entrypoint: `.agent/START_HERE.md`
- Budgets: `CONTEXT_BUDGETS.md`
- Active state: `.agent/state/current.md`
- Next tasks: `.agent/state/next.md`
- Session summaries: `.agent/summaries/sessions/`
- Weekly rollups: `.agent/summaries/weekly/`
- Monthly rollups: `.agent/summaries/monthly/`
- Active tasks: `.agent/tasks/in-progress.md`
- Long-term tasks: `.agent/tasks/backlog.md`
- Completed large work: `.agent/tasks/done/`
- Architecture decisions: `.agent/decisions/`
- Decision index: `.agent/decisions/index.md`
- Failure memory: `.agent/failures/`
- Archive layer: `.agent/archive/`
- System health: `.agent/health/system-health.md`
- Drift check: `.agent/health/drift-check.md`
- Weekly maintenance: `.agent/health/weekly-maintenance.md`
- Temporary scratchpad: `.agent/scratchpads/debug.md`

Scratchpad rule:

- scratchpads are temporary and should not become long-lived memory
- move durable information into retrieval or summaries
- convert end-of-session findings into `.agent/summaries/...`
- clear the scratchpad after the session summary is written

# Missing Legacy Files

- `claude.md` was not present in this workspace.
- `memory.md` was not present in this workspace.
