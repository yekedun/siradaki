import { strict as assert } from "assert";
import {
  appointmentForSlot,
  assertFunctionsRuntime,
  bookWidgetAppointment,
  ensureBookingFixture,
  firstAvailableSlot,
  nextWeekdayDate,
} from "./backend-helpers.js";

const ATTEMPTS = 10;
const date = nextWeekdayDate(1);

async function main() {
  await assertFunctionsRuntime();
  await ensureBookingFixture(date);

  const startsAt = await firstAvailableSlot(date);
  const settled = await Promise.allSettled(
    Array.from({ length: ATTEMPTS }, (_, index) => bookWidgetAppointment(startsAt, index)),
  );

  const responses = settled.map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  });

  const successCount = responses.filter((res) => res.ok).length;
  const conflictCount = responses.filter((res) => res.status === 409).length;
  const unexpected = responses.filter((res) => !res.ok && res.status !== 409);

  assert.equal(successCount, 1, `expected 1 successful booking, got ${successCount}`);
  assert.equal(conflictCount, ATTEMPTS - 1, `expected ${ATTEMPTS - 1} conflicts, got ${conflictCount}`);
  assert.equal(
    unexpected.length,
    0,
    `unexpected statuses: ${unexpected.map((res) => res.status).join(", ")}`,
  );

  const appointments = await appointmentForSlot(startsAt);
  assert.equal(appointments.length, 1);
  assert.equal(appointments[0].status, "confirmed");

  console.log(`concurrent-booking-ok success=${successCount} conflict=${conflictCount} ${startsAt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
