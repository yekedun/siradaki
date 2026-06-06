import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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

export function OwnerSettingsAvatar() {
  const router = useRouter();
  const { shopName, shopSlug } = useShop();
  const initials = getInitials(shopName || shopSlug);

  return (
    <TouchableOpacity
      onPress={() => router.push('/(owner)/settings')}
      style={styles.button}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel="Ayarlar"
      hitSlop={8}
    >
      <Text style={styles.text}>{initials}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: colors.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.slate[0],
    shadowColor: colors.ink[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  text: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
});
