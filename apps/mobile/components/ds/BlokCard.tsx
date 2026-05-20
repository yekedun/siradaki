import { View, Text, StyleSheet } from "react-native";
import { T, R } from "../../lib/theme";

interface BlokCardProps {
  time: string;
  duration: number;
  label: string;
}

export function BlokCard({ time, duration, label }: BlokCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.timeCol}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.dur}>{duration} DK</Text>
      </View>
      <View style={styles.labelCol}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: T.slate400,
    backgroundColor: T.bgSunken,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  timeCol: { minWidth: 56 },
  time: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    color: T.slate700,
  },
  dur: {
    fontSize: 10,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.4,
    color: T.slate500,
    marginTop: 5,
  },
  labelCol: { flex: 1, justifyContent: "center" },
  label: {
    fontSize: 11,
    fontFamily: 'Montserrat-Bold',
    letterSpacing: 1.98,
    color: T.fg2,
  },
});
