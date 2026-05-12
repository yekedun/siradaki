param(
  [switch]$SkipReset,
  [switch]$SkipRace
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$proofSql = Join-Path $root "supabase\snippets\scheduling-proof.sql"
$dbContainer = "supabase_db_berber-randevu"

function Invoke-SupabaseQueryFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  Get-Content -Path $Path -Raw | docker exec -i $dbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed for $Path"
  }
}

if (-not $SkipReset) {
  supabase db reset --local
  if ($LASTEXITCODE -ne 0) {
    throw "supabase db reset failed"
  }
}

Invoke-SupabaseQueryFile -Path $proofSql

if ($SkipRace) {
  Write-Host "scheduling-race-skipped"
  exit 0
}

$raceId = [Guid]::NewGuid().ToString("N")
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "berber-scheduling-proof-$raceId"
New-Item -ItemType Directory -Path $tempDir | Out-Null

$setupSql = Join-Path $tempDir "race-setup.sql"
$attemptSql = Join-Path $tempDir "race-attempt.sql"
$verifySql = Join-Path $tempDir "race-verify.sql"
$cleanupSql = Join-Path $tempDir "race-cleanup.sql"

@"
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-4000-8000-100000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'proof-race-owner@example.test',
  crypt('scheduling-proof', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{}'::jsonb,
  '{}'::jsonb
) on conflict (id) do nothing;

insert into public.shops (
  id, owner_user_id, owner_id, slug, display_name, name, timezone, working_hours
) values (
  '00000000-0000-4000-8000-100000000101',
  '00000000-0000-4000-8000-100000000001',
  '00000000-0000-4000-8000-100000000001',
  'proof-race',
  'Proof Race',
  'Proof Race',
  'Europe/Istanbul',
  '{
    "mon": {"open": "09:00", "close": "19:00", "enabled": true},
    "tue": {"open": "09:00", "close": "19:00", "enabled": true},
    "wed": {"open": "09:00", "close": "19:00", "enabled": true},
    "thu": {"open": "09:00", "close": "19:00", "enabled": true},
    "fri": {"open": "09:00", "close": "19:00", "enabled": true},
    "sat": {"open": "09:00", "close": "17:00", "enabled": true},
    "sun": {"open": null, "close": null, "enabled": false}
  }'::jsonb
) on conflict (id) do update set working_hours = excluded.working_hours;

insert into public.staff (id, shop_id, user_id, name, role, is_active)
values (
  '00000000-0000-4000-8000-100000000201',
  '00000000-0000-4000-8000-100000000101',
  null,
  'Proof Race Staff',
  'staff'::public.staff_role,
  true
) on conflict (id) do update set is_active = true;

insert into public.services (id, shop_id, name, duration_min, price_cents, display_order, is_active)
values (
  '00000000-0000-4000-8000-100000000301',
  '00000000-0000-4000-8000-100000000101',
  'Proof Race 30',
  30,
  3000,
  1,
  true
) on conflict (id) do update set duration_min = 30, is_active = true;

insert into public.staff_schedules (
  staff_id, day_of_week, is_working, work_start, work_end, break_start, break_end
) values (
  '00000000-0000-4000-8000-100000000201',
  1,
  true,
  '09:00',
  '19:00',
  null,
  null
) on conflict (staff_id, day_of_week) do update
set is_working = true,
    work_start = '09:00',
    work_end = '19:00',
    break_start = null,
    break_end = null;

delete from public.appointments
where staff_id = '00000000-0000-4000-8000-100000000201'
  and starts_at = '2026-05-18 14:00 Europe/Istanbul';
"@ | Set-Content -Path $setupSql -Encoding UTF8

@"
select public.create_appointment_atomic(
  'proof-race',
  null,
  '00000000-0000-4000-8000-100000000301',
  '00000000-0000-4000-8000-100000000201',
  '2026-05-18 14:00 Europe/Istanbul',
  'Proof Race',
  null,
  null,
  null
);
"@ | Set-Content -Path $attemptSql -Encoding UTF8

@"
do `$`$
declare
  v_count int;
  v_mirror_count int;
begin
  select count(*) into v_count
  from public.appointments
  where staff_id = '00000000-0000-4000-8000-100000000201'
    and starts_at = '2026-05-18 14:00 Europe/Istanbul'
    and status = 'confirmed';

  if v_count <> 1 then
    raise exception 'race proof expected exactly one confirmed appointment, got %', v_count;
  end if;

  select count(*) into v_mirror_count
  from public.appointment_slots aps
  join public.appointments a on a.id = aps.appointment_id
  where a.staff_id = '00000000-0000-4000-8000-100000000201'
    and a.starts_at = '2026-05-18 14:00 Europe/Istanbul'
    and a.status = 'confirmed';

  if v_mirror_count <> 1 then
    raise exception 'race proof expected exactly one realtime mirror row, got %', v_mirror_count;
  end if;
end
`$`$;

select 'scheduling-race-ok' as result;
"@ | Set-Content -Path $verifySql -Encoding UTF8

@"
delete from public.appointments where staff_id = '00000000-0000-4000-8000-100000000201';
delete from public.blocks where staff_id = '00000000-0000-4000-8000-100000000201';
delete from public.staff_schedules where staff_id = '00000000-0000-4000-8000-100000000201';
delete from public.services where id = '00000000-0000-4000-8000-100000000301';
delete from public.staff where id = '00000000-0000-4000-8000-100000000201';
delete from public.shops where id = '00000000-0000-4000-8000-100000000101';
"@ | Set-Content -Path $cleanupSql -Encoding UTF8

try {
  Invoke-SupabaseQueryFile -Path $setupSql

  $jobs = 1..2 | ForEach-Object {
    Start-Job -ScriptBlock {
      param($path, $workdir, $container)
      Set-Location $workdir
      Get-Content -Path $path -Raw | docker exec -i $container psql -v ON_ERROR_STOP=1 -U postgres -d postgres *>&1
      $LASTEXITCODE
    } -ArgumentList $attemptSql, $root, $dbContainer
  }

  $results = $jobs | ForEach-Object {
    Wait-Job $_ | Out-Null
    $output = Receive-Job $_
    Remove-Job $_
    $output
  }

  $exitCodes = $results | Where-Object { $_ -is [int] }
  $successes = ($exitCodes | Where-Object { $_ -eq 0 }).Count
  $failures = ($exitCodes | Where-Object { $_ -ne 0 }).Count

  if ($successes -ne 1 -or $failures -ne 1) {
    $results | ForEach-Object { Write-Host $_ }
    throw "race proof expected one successful booking and one conflict failure; got $successes success(es), $failures failure(s)"
  }

  Invoke-SupabaseQueryFile -Path $verifySql
}
finally {
  try {
    Invoke-SupabaseQueryFile -Path $cleanupSql
  }
  catch {
    Write-Warning $_
  }
  Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
