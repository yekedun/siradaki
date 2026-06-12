import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../lib/theme';
import { useShop } from '../../lib/ShopContext';

function getInitials(value: string | null | undefined) {
  const parts = (value ?? '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'SR';
  return parts
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase('tr-TR');
}

export function OwnerTabAvatar({ focused }: { focused: boolean }) {
  const { shopName, shopSlug } = useShop();
  const initials = getInitials(shopName || shopSlug);

  return (
    <View style={[styles.tabAvatar, !focused && styles.tabAvatarInactive]}>
      <Text style={styles.tabAvatarText}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brand[500],
  },
  tabAvatarInactive: {
    backgroundColor: colors.slate[500],
    borderColor: colors.slate[300],
  },
  tabAvatarText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 10,
    color: '#ffffff',
  },
});
