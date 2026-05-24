type BlockReason = 'anlik' | 'mola' | 'kisisel';

interface BuildBlockInsertInput {
  staffId: string | null;
  startTime: string;
  durationMin: number;
  reason: BlockReason;
  baseDate?: Date;
}

export interface BlockInsertPayload {
  staff_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  created_via: 'app';
}

export type BuildBlockInsertResult =
  | { ok: true; payload: BlockInsertPayload }
  | { ok: false; message: string };

const REASON_MAP: Record<BlockReason, string> = {
  anlik: 'walkin',
  mola: 'break',
  kisisel: 'personal',
};

export function buildBlockInsert(input: BuildBlockInsertInput): BuildBlockInsertResult {
  if (!input.staffId) {
    return { ok: false, message: 'Hesap bilgileri yuklenemedi. Lutfen tekrar deneyin.' };
  }

  const [hours, minutes] = input.startTime.split(':').map(Number);
  const startsAt = new Date(input.baseDate ?? new Date());
  startsAt.setHours(hours, minutes, 0, 0);
  const endsAt = new Date(startsAt.getTime() + input.durationMin * 60_000);

  return {
    ok: true,
    payload: {
      staff_id: input.staffId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reason: REASON_MAP[input.reason],
      created_via: 'app',
    },
  };
}
