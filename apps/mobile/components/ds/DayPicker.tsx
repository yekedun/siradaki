import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors, radius } from '../../lib/theme';

/** Turkish day abbreviations Mon→Sun (index 0=Monday, 6=Sunday). */
const TR_DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;
/** Full Turkish day names indexed by JS getDay() (0=Sunday). */
const TR_DAYS_FULL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'] as const;
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] as const;

/**
 * Maps a JS Date (getDay() returns 0=Sunday…6=Saturday) to the
 * Turkish Mon-first index used by TR_DAYS_SHORT.
 */
function trDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

interface DayPickerProps {
  /**
   * Currently selected date — compared by calendar day, not timestamp.
   */
  selected: Date;
  onSelect: (date: Date) => void;
  /** Total number of days to show.  Defaults to 7. */
  dayCount?: number;
  /**
   * How many days before today the window starts.  Defaults to 0
   * (today is the first cell).  Owner agenda passes 2 so recent past
   * days remain reviewable.
   */
  pastDays?: number;
}

export function DayPicker({ selected, onSelect, dayCount = 7, pastDays = 0 }: DayPickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: Date[] = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - pastDays + i);
    return d;
  });

  const selStr = selected.toDateString();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {days.map((d) => {
        const isSel = d.toDateString() === selStr;
        return (
          <TouchableOpacity
            key={d.toISOString()}
            onPress={() => onSelect(d)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${TR_DAYS_FULL[d.getDay()]}`}
            accessibilityState={{ selected: isSel }}
            style={[styles.day, isSel ? styles.dayActive : styles.dayDefault]}
          >
            {/*
              Source: opacity 0.7 on day-name text.
              Color is inherited from the tile: white when selected, ink[900] otherwise.
            */}
            <Text style={[styles.dayName, isSel ? styles.dayNameActive : styles.dayNameDefault]}>
              {TR_DAYS_SHORT[trDayIndex(d)]}
            </Text>
            <Text style={[styles.dayNum, isSel && styles.textWhite]}>
              {d.getDate()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* Explicit height prevents Android horizontal ScrollView from flex-expanding */
  scroll: {
    height: 80,
    flexGrow: 0,
    flexShrink: 0,
  },
  content: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },

  day: {
    width: 56,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayDefault: {
    backgroundColor: colors.slate[0],
    borderColor: colors.slate[200],
  },
  dayActive: {
    backgroundColor: colors.ink[900],
    borderColor: colors.ink[900],
  },

  dayName: {
    fontSize: 10,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    /* opacity 0.7 applied via each variant below */
  },
  /* source: isSel ? '#fff' : 'var(--ink-900)' at opacity 0.7 */
  dayNameDefault: { color: colors.ink[900], opacity: 0.7 },
  dayNameActive:  { color: '#ffffff',       opacity: 0.7 },

  dayNum: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: colors.ink[900],
  },
  textWhite: { color: '#ffffff' },
});
