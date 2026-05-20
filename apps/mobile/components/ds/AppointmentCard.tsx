import { Pressable, View, Text, StyleSheet } from "react-native";
import { T, R, Shadow } from "../../lib/theme";

type State = "upcoming" | "active" | "done";

interface AppointmentCardProps {
  time: string;
  duration: number;
  customer: string;
  service: string;
  state?: State;
  onPress?: () => void;
}

const stateMap: Record<State, {
  bg: string; border: string; text: string; sub: string; opacity: number; strike: boolean;
}> = {
  upcoming: { bg: T.bgElevated, border: T.border,   text: T.fg1,        sub: T.slate500,              opacity: 1,    strike: false },
  active:   { bg: T.brand600,   border: T.brand700,  text: T.fgOnAccent, sub: "rgba(255,255,255,0.6)", opacity: 1,    strike: false },
  done:     { bg: T.bgElevated, border: T.border,    text: T.fg1,        sub: T.slate500,              opacity: 0.55, strike: true  },
};

export function AppointmentCard({
  time,
  duration,
  customer,
  service,
  state = "upcoming",
  onPress,
}: AppointmentCardProps) {
  const v = stateMap[state];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        { backgroundColor: v.bg, borderColor: v.border, opacity: v.opacity },
        Shadow.xs,
      ]}
    >
      <View style={styles.timeCol}>
        <Text style={[styles.time, { color: v.text }]}>{time}</Text>
        <Text style={[styles.dur, { color: v.sub }]}>{duration} DK</Text>
      </View>
      <View style={styles.infoCol}>
        <Text
          style={[styles.customer, { color: v.text, textDecorationLine: v.strike ? "line-through" : "none" }]}
          numberOfLines={1}
        >
          {customer}
        </Text>
        <Text style={[styles.service, { color: v.sub }]} numberOfLines={1}>
          {service}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.md,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  timeCol: { minWidth: 56 },
  time: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    lineHeight: 14,
  },
  dur: {
    fontSize: 10,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.4,
    marginTop: 5,
  },
  infoCol: { flex: 1 },
  customer: {
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 18,
  },
  service: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
});
