import { Pressable, View, StyleSheet, ViewStyle } from "react-native";
import { T, R, Shadow } from "../../lib/theme";

interface CardProps {
  children: React.ReactNode;
  accent?: boolean;
  padded?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({
  children,
  accent = false,
  padded = true,
  onPress,
  style,
}: CardProps) {
  const Container = onPress ? Pressable : (View as React.ElementType);
  return (
    <Container
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: accent ? T.brand600 : T.bgElevated,
          borderColor: accent ? T.brand700 : T.border,
          padding: padded ? 16 : 0,
        },
        Shadow.sm,
        style,
      ]}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.md,
    borderWidth: 1,
  },
});
