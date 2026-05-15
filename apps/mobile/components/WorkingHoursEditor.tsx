import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { DAY_KEYS, type DayKey } from "@berber/shared/constants";
import type { WorkingHours, WorkingDayHours } from "@berber/shared/types";
import { supabase } from "../lib/supabase";
import { T, R, Shadow } from "../lib/theme";

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Pazartesi",
  tue: "Salı",
  wed: "Çarşamba",
  thu: "Perşembe",
  fri: "Cuma",
  sat: "Cumartesi",
  sun: "Pazar",
};

const ORDERED_DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function timeStringToDate(t: string | null): Date {
  const d = new Date();
  if (t) {
    const [h, m] = t.split(":").map(Number);
    d.setHours(h ?? 9, m ?? 0, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

function normalizeDraft(raw: WorkingHours | null): WorkingHours {
  const result = {} as WorkingHours;
  for (const day of DAY_KEYS) {
    result[day] = raw?.[day] ?? { enabled: false, open: null, close: null };
  }
  return result;
}

interface WorkingHoursEditorProps {
  shopId: string;
  initialHours: WorkingHours | null;
  onSaved?: () => void;
}

export function WorkingHoursEditor({
  shopId,
  initialHours,
  onSaved,
}: WorkingHoursEditorProps) {
  const [draft, setDraft] = useState<WorkingHours>(() =>
    normalizeDraft(initialHours)
  );
  const [baseline, setBaseline] = useState<WorkingHours>(() =>
    normalizeDraft(initialHours)
  );
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    day: DayKey;
    field: "open" | "close";
  } | null>(null);

  const isDirty =
    JSON.stringify(draft) !== JSON.stringify(baseline);

  function toggleDay(day: DayKey) {
    setDraft((prev) => {
      const current = prev[day];
      const enabling = !current.enabled;
      return {
        ...prev,
        [day]: {
          ...current,
          enabled: enabling,
          open: enabling ? (current.open ?? "09:00") : current.open,
          close: enabling ? (current.close ?? "19:00") : current.close,
        },
      };
    });
  }

  function onTimeChange(_event: DateTimePickerEvent, date?: Date) {
    if (!pickerTarget) return;
    if (Platform.OS === "android") setPickerTarget(null);
    if (!date) return;
    const { day, field } = pickerTarget;
    setDraft((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: toTimeString(date) },
    }));
  }

  async function handleSave() {
    for (const day of ORDERED_DAYS) {
      const d = draft[day];
      if (d.enabled && d.open && d.close && d.close <= d.open) {
        Alert.alert(
          "Geçersiz saat",
          `${DAY_LABELS[day]}: kapanış saati açılış saatinden önce olamaz.`
        );
        return;
      }
    }

    setSaving(true);
    // WorkingHours is a plain JSON-serialisable object; cast to satisfy Supabase's Json type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("shops")
      .update({ working_hours: draft as any })
      .eq("id", shopId);
    setSaving(false);

    if (error) {
      Alert.alert("Hata", error.message);
      return;
    }

    setBaseline(draft);
    onSaved?.();
  }

  const pickerValue = pickerTarget
    ? timeStringToDate(draft[pickerTarget.day][pickerTarget.field])
    : new Date();

  return (
    <View>
      <View style={styles.card}>
        {ORDERED_DAYS.map((day, index) => {
          const d = draft[day];
          const isLast = index === ORDERED_DAYS.length - 1;
          return (
            <View
              key={day}
              style={[styles.dayRow, !isLast && styles.dayRowBorder]}
            >
              <Text
                style={[styles.dayLabel, !d.enabled && styles.dayLabelMuted]}
              >
                {DAY_LABELS[day]}
              </Text>
              {d.enabled ? (
                <View style={styles.timePair}>
                  <Pressable
                    onPress={() => setPickerTarget({ day, field: "open" })}
                    style={styles.timeChip}
                  >
                    <Text style={styles.timeText}>{d.open ?? "09:00"}</Text>
                  </Pressable>
                  <Text style={styles.timeSep}>–</Text>
                  <Pressable
                    onPress={() => setPickerTarget({ day, field: "close" })}
                    style={styles.timeChip}
                  >
                    <Text style={styles.timeText}>{d.close ?? "19:00"}</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.closedLabel}>Kapalı</Text>
              )}
              <Switch
                value={d.enabled}
                onValueChange={() => toggleDay(day)}
                trackColor={{ true: T.navy, false: T.line }}
                thumbColor="#fff"
              />
            </View>
          );
        })}
      </View>

      {pickerTarget !== null && (
        <>
          <DateTimePicker
            value={pickerValue}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onTimeChange}
            minuteInterval={30}
          />
          {Platform.OS === "ios" && (
            <Pressable
              onPress={() => setPickerTarget(null)}
              style={styles.pickerDismiss}
            >
              <Text style={styles.pickerDismissText}>Tamam</Text>
            </Pressable>
          )}
        </>
      )}

      <Pressable
        onPress={handleSave}
        disabled={!isDirty || saving}
        style={({ pressed }) => [
          styles.saveBtn,
          (!isDirty || saving) && styles.saveBtnDisabled,
          pressed && isDirty && { opacity: 0.85 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Kaydet</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: R.card,
    overflow: "hidden",
    ...Shadow.card,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  dayRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  dayLabel: {
    width: 90,
    fontSize: 14,
    fontWeight: "600",
    color: T.ink,
  },
  dayLabelMuted: {
    color: T.muted,
  },
  timePair: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeChip: {
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "600",
    color: T.navy,
  },
  timeSep: {
    fontSize: 13,
    color: T.muted,
  },
  closedLabel: {
    flex: 1,
    fontSize: 13,
    color: T.mutedAlt,
  },
  pickerDismiss: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  pickerDismissText: {
    fontSize: 15,
    fontWeight: "600",
    color: T.navy,
  },
  saveBtn: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: T.navy,
    borderRadius: R.cta,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.cta,
  },
  saveBtnDisabled: {
    backgroundColor: T.surfaceAlt,
    ...Shadow.card,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
