param(
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$smokeSql = Join-Path $root "supabase\snippets\scheduling-remote-smoke.sql"

if (-not $SkipPush) {
  supabase db push --linked
  if ($LASTEXITCODE -ne 0) {
    throw "supabase db push failed"
  }
}

supabase db query --linked --file $smokeSql --output table
if ($LASTEXITCODE -ne 0) {
  throw "supabase db query failed for $smokeSql"
}
