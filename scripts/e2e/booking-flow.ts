import { strict as assert } from "assert";
import {
  appointmentForSlot,
  assertFunctionsRuntime,
  bookWidgetAppointment,
  ensureBookingFixture,
  firstAvailableSlot,
  fixture,
  mirrorRows,
  nextWeekdayDate,
} from "./backend-helpers.js";

const date = nextWeekdayDate(1);

async function main() {
  await assertFunctionsRuntime();
  await ensureBookingFixture(date);

  const startsAt = await firstAvailableSlot(date);
  const bookingRes = await bookWidgetAppointment(startsAt);
  assert.equal(bookingRes.ok, true, `booking failed: HTTP ${bookingRes.status} ${await bookingRes.text()}`);

  const appointments = await appointmentForSlot(startsAt);
  assert.equal(appointments.length, 1);

  const appointment = appointments[0];
assert.equal(appointment.status, "confirmed");
assert.equal(appointment.staff_id, fixture.staffId);
assert.equal(appointment.service_id, fixture.serviceId);

  const mirrors = await mirrorRows(appointment.id);
  assert.equal(mirrors.length, 1);
  assert.equal(mirrors[0].appointment_id, appointment.id);
  assert.equal(mirrors[0].staff_id, fixture.staffId);
  assert.equal(mirrors[0].starts_at, appointment.starts_at);
  assert.equal(mirrors[0].ends_at, appointment.ends_at);

  console.log(`booking-flow-ok ${appointment.id} ${startsAt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
