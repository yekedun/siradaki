export interface RpcProbeConfig {
  name: string;
  // Minimal args to call via service_role. null = skip with reason.
  args: Record<string, unknown> | null;
  skipReason?: string;
}

export interface EdgeFnProbeConfig {
  name: string;
  // Local Supabase enforces JWT before auth-required functions receive OPTIONS.
  expectedOptionsAllowedStatus: number;
  // Backward-compatible field used by scripts/audit/probe.ts.
  expectedAnonStatus: number;
  // No Authorization header. Auth-required functions should be blocked by the runtime or handler.
  expectedNoAuthStatus: number[];
  // Service-role caller with empty body. Non-5xx means the function is alive and rejected smoke input.
  expectedServiceStatus: number;
  wrongMethodStatus: number[];
  body: Record<string, unknown>;
}

const STATIC_RPC_PROBES: RpcProbeConfig[] = [
  {
    name: "schedule_day_bounds",
    args: {
      p_date: "2026-06-01",
      p_timezone: "Europe/Istanbul",
    },
  },
];

const RUNTIME_RPC_PROBES: RpcProbeConfig[] = [
  { name: "get_occupied_ranges", args: null, skipReason: "requires staff_id + date; filled at runtime" },
  { name: "get_shop_occupied_ranges", args: null, skipReason: "requires shop_id + date; filled at runtime" },
  { name: "get_staff_day_hours", args: null, skipReason: "requires staff_id + date; filled at runtime" },
  { name: "get_shop_dashboard_stats", args: null, skipReason: "requires shop_id; filled at runtime" },
  { name: "get_commission_report", args: null, skipReason: "requires shop_id; filled at runtime" },
  { name: "get_staff_commission_configs", args: null, skipReason: "requires shop_id; filled at runtime" },
  { name: "staff_is_inside_work_window", args: null, skipReason: "requires staff_id + timestamps; filled at runtime" },
  { name: "schedule_has_conflict", args: null, skipReason: "requires staff_id + timestamps; filled at runtime" },
];

const MUTATION_RPC_PROBES: RpcProbeConfig[] = [
  { name: "create_appointment_atomic", args: null, skipReason: "mutating; tested in trigger probe" },
  { name: "update_appointment_atomic", args: null, skipReason: "mutating; tested in trigger probe" },
  { name: "cancel_appointment_atomic", args: null, skipReason: "mutating; tested in trigger probe" },
  { name: "complete_appointment_with_revenue", args: null, skipReason: "mutating; tested in trigger probe" },
  { name: "create_block_atomic", args: null, skipReason: "mutating; tested in trigger probe" },
  { name: "update_staff_commission_config", args: null, skipReason: "mutating; tested in trigger probe" },
];

export const RPC_PROBES: RpcProbeConfig[] = [
  ...STATIC_RPC_PROBES,
  ...RUNTIME_RPC_PROBES,
  ...MUTATION_RPC_PROBES,
];

export const EDGE_FN_PROBES: EdgeFnProbeConfig[] = [
  { name: "accept-invite", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "app-book-appointment", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "app-cancel-appointment", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "block-walkin", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [405], body: {} },
  { name: "create-manual-block", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "create-widget-token", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "daily-summary-push", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 403, expectedNoAuthStatus: [401], expectedServiceStatus: 200, wrongMethodStatus: [401, 405], body: {} },
  { name: "delete-account", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "invite-barber", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "open-invite", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 400, expectedNoAuthStatus: [400, 429], expectedServiceStatus: 400, wrongMethodStatus: [405], body: {} },
  { name: "register-shop", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "send-push", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 403, expectedNoAuthStatus: [401], expectedServiceStatus: 200, wrongMethodStatus: [401, 405], body: {} },
  { name: "staff-cancel-appointment", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 401, expectedNoAuthStatus: [401], expectedServiceStatus: 401, wrongMethodStatus: [401, 405], body: {} },
  { name: "widget-book-appointment", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 400, expectedNoAuthStatus: [400, 429], expectedServiceStatus: 400, wrongMethodStatus: [405], body: {} },
  { name: "widget-get-availability", expectedOptionsAllowedStatus: 204, expectedAnonStatus: 400, expectedNoAuthStatus: [400], expectedServiceStatus: 400, wrongMethodStatus: [400], body: {} },
];
