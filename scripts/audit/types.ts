export type ObjectKind =
  | "table"
  | "rpc"
  | "trigger"
  | "trigger_fn"
  | "edge_fn"
  | "realtime_channel";

export interface IntegrationObject {
  kind: ObjectKind;
  name: string;
  definedIn?: string;   // file path (migration or edge fn)
  consumers: string[];  // which files call this object
}

export type GapSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface GapEntry {
  severity: GapSeverity;
  object: string;
  kind: ObjectKind;
  message: string;
}

export type ProbeStatus = "PASS" | "FAIL" | "SKIP";

export interface ProbeResult {
  category: "rpc" | "edge_fn" | "rls" | "trigger" | "realtime";
  check: string;
  status: ProbeStatus;
  message: string;
  durationMs?: number;
}
