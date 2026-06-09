/**
 * AddBlockModal — Manuel blok oluşturma (mola, kişisel, walk-in).
 * create-manual-block edge fn'ını çağırır, şu anki zamandan itibaren blok ekler.
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../lib/theme';
import { Button } from './ds/Button';
import { supabase } from '../lib/supabase';

type Reason = 'break' | 'personal' | 'walkin';

const REASON_LABELS: Record<Reason, string> = {
  break:    'Mola',
  personal: 'Kişisel',
  walkin:   'Anlık Müşteri',
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

interface StaffOption {
  id: string;
  name: string;
}

interface AddBlockModalProps {
  visible: boolean;
  onClose: () => void;
  staffList: StaffOption[];
  onSaved: () => void;
}

export function AddBlockModal({ visible, onClose, staffList, onSaved }: AddBlockModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    staffList.length === 1 ? staffList[0].id : null,
  );
  const [durationMin, setDurationMin] = useState(30);
  const [reason, setReason] = useState<Reason>('break');
  const [loading, setLoading] = useState(false);

  const canSubmit = !!selectedStaffId && durationMin >= 5;

  async function handleSave() {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Hata', 'Oturum bulunamadı.');
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const res = await fetch(`${supabaseUrl}/functions/v1/create-manual-block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          staff_id:    selectedStaffId,
          duration_min: durationMin,
          reason,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        Alert.alert('Hata', body.error ?? 'Blok oluşturulamadı.');
        return;
      }

      onSaved();
      onClose();
    } catch {
      Alert.alert('Hata', 'Bir hata oluştu. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        <Text style={styles.title}>Blok Ekle</Text>
        <Text style={styles.subtitle}>Şu andan itibaren zaman bloğu oluştur</Text>

        {/* Personel seçimi — birden fazla personel varsa */}
        {staffList.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Personel</Text>
            <View style={styles.chipRow}>
              {staffList.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, selectedStaffId === s.id && styles.chipActive]}
                  onPress={() => setSelectedStaffId(s.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selectedStaffId === s.id && styles.chipTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Süre */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Süre</Text>
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, durationMin === d && styles.chipActive]}
                onPress={() => setDurationMin(d)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, durationMin === d && styles.chipTextActive]}>
                  {d} dk
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Neden */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Neden</Text>
          <View style={styles.chipRow}>
            {(Object.keys(REASON_LABELS) as Reason[]).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, reason === r && styles.chipActive]}
                onPress={() => setReason(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, reason === r && styles.chipTextActive]}>
                  {REASON_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.btn}>
            <Button variant="secondary" size="md" full onPress={handleClose}>
              Vazgeç
            </Button>
          </View>
          <View style={styles.btn}>
            <Button
              variant="primary"
              size="md"
              full
              disabled={!canSubmit || loading}
              onPress={handleSave}
            >
              {loading ? 'Ekleniyor…' : 'Blok Ekle'}
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.slate[0],
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate[300],
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    color: colors.ink[900],
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    color: colors.slate[500],
    marginBottom: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.slate[500],
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[50],
  },
  chipActive: {
    borderColor: colors.brand[600],
    backgroundColor: colors.brand[100],
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Montserrat-SemiBold',
    color: colors.slate[500],
  },
  chipTextActive: {
    color: colors.brand[700],
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 12,
  },
  btn: {
    flex: 1,
  },
});
