import { View, Text, StyleSheet } from "react-native";
import { T, Type, S } from "../../lib/theme";

interface OverlineHeaderProps {
  eyebrow: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
  dark?: boolean;
}

export function OverlineHeader({
  eyebrow,
  title,
  meta,
  trailing,
  dark = false,
}: OverlineHeaderProps) {
  const eyebrowColor = dark ? "rgba(245,242,236,0.6)" : T.slate500;
  const titleColor = dark ? T.fgOnInk : T.fg1;
  return (
    <View style={styles.wrapper}>
      <View style={styles.left}>
        <Text style={[styles.eyebrow, { color: eyebrowColor }]}>
          {eyebrow.toUpperCase()}
        </Text>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: S.s5,
    paddingTop: S.s2,
    paddingBottom: S.s4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  left: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 11,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 1.76,
    lineHeight: 11,
  },
  title: {
    fontSize: 32,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    letterSpacing: -0.64,
    lineHeight: 34,
    marginTop: 10,
  },
  meta: {
    fontSize: 13,
    fontFamily: Type.family,
    color: T.fg3,
    marginTop: 8,
  },
  trailing: { flexShrink: 0 },
});
