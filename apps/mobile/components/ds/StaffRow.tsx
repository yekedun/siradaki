import { Pressable, View, Text, StyleSheet } from "react-native";
import { T, R, S } from "../../lib/theme";
import { StatusPill } from "./StatusPill";
import type { Tone } from "./StatusPill";

interface StaffRowProps {
  name: string;
  status?: string;
  meta?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StaffRow({ name, status, meta, trailing, onPress }: StaffRowProps) {
  const tone: Tone | undefined = status === "Aktif" ? "ok" : status ? "bad" : undefined;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.row}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {tone && status && <StatusPill tone={tone}>{status}</StatusPill>}
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: T.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: R.pill,
    backgroundColor: T.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Montserrat-Bold',
    letterSpacing: 0.52,
    color: T.ink900,
  },
  info: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
    color: T.fg1,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: T.fg3,
    marginTop: 2,
  },
});
