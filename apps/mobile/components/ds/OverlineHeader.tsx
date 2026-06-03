import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';

interface OverlineHeaderProps {
  eyebrow?: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
}

export function OverlineHeader({
  eyebrow,
  title,
  meta,
  trailing = null,
}: OverlineHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.left}>
        {eyebrow != null && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title}>{title}</Text>
        {meta != null && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {trailing != null && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { minWidth: 0, flex: 1 },
  trailing: { flexShrink: 0 },
  eyebrow: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 11,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    lineHeight: 11,
    color: colors.slate[500],
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 32,
    letterSpacing: -0.64,
    lineHeight: 33.6,
    marginTop: 10,
    color: colors.ink[900],
  },
  meta: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 13,
    marginTop: 8,
    color: colors.slate[500],
  },
});
