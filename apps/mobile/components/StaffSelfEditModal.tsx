/**
 * StaffSelfEditModal — Oturum açmış kullanıcının kendi staff profilini düzenlemesi.
 * Ad, telefon ve bio güncellenir. Settings ekranından açılır.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import { Button } from './ds/Button';
import { supabase } from '../lib/supabase';

interface StaffSelfEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const INPUT = {
  backgroundColor: colors.slate[50],
  borderWidth: 1.5,
  borderColor: colors.slate[200],
  borderRadius: 8,
  paddingHorizontal: 14,
  paddingVertical: 11,
  fontSize: 15,
  fontFamily: 'Montserrat-Regular' as const,
  color: colors.ink[900],
};

export function StaffSelfEditModal({ visible, onClose, onSaved }: StaffSelfEditModalProps) {
  const [staffId, setStaffId] = useState<string | null>(null);
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [bio,     setBio]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSuccess(false);
    setError(null);

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('staff')
        .select('id, name, phone, bio')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setStaffId(data.id);
        setName(data.name ?? '');
        setPhone(data.phone ?? '');
        setBio(data.bio ?? '');
      }
    }

    load();
  }, [visible]);

  async function handleSave() {
    if (!staffId || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { error: saveErr } = await supabase
        .from('staff')
        .update({
          name:  name.trim(),
          phone: phone.trim() || null,
          bio:   bio.trim()   || null,
        })
        .eq('id', staffId);

      if (saveErr) {
        setError('Profil kaydedilemedi. Tekrar dene.');
        return;
      }
      setSuccess(true);
      onSaved?.();
    } catch {
      setError('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Profilim</Text>

        {success ? (
          <View style={styles.successWrap}>
            <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
            <Text style={styles.successTitle}>Kaydedildi</Text>
            <Text style={styles.successSub}>Profil bilgilerin güncellendi.</Text>
            <Button variant="primary" size="md" full onPress={onClose}>Tamam</Button>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.label}>Ad Soyad</Text>
                <TextInput
                  style={INPUT}
                  value={name}
                  onChangeText={setName}
                  placeholder="Adın Soyadın"
                  placeholderTextColor={colors.slate[400]}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={INPUT}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="05XX XXX XX XX"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Hakkında</Text>
                <TextInput
                  style={[INPUT, styles.bioInput]}
                  value={bio}
                  onChangeText={t => setBio(t.slice(0, 200))}
                  placeholder="Uzmanlıkların, deneyimin..."
                  placeholderTextColor={colors.slate[400]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{bio.length}/200</Text>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button variant="secondary" size="md" onPress={onClose}>İptal</Button>
              <View style={{ flex: 1 }}>
                <Button
                  variant="primary"
                  size="md"
                  full
                  disabled={!name.trim() || loading}
                  onPress={handleSave}
                >
                  {loading ? 'Kaydediliyor…' : 'Kaydet'}
                </Button>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.slate[0], paddingHorizontal: 20, paddingTop: 8 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.slate[300],
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Montserrat-Bold',
    color: colors.ink[900],
    marginBottom: 24,
  },
  fields: { gap: 18 },
  field: { gap: 6 },
  label: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.slate[500],
  },
  bioInput: {
    height: 100,
    paddingTop: 11,
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Montserrat-Regular',
    color: colors.slate[400],
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    color: colors.coral[600],
    textAlign: 'center',
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    paddingBottom: 20,
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 56, height: 56, borderRadius: 999,
    backgroundColor: colors.brand[100],
    alignItems: 'center', justifyContent: 'center',
  },
  successCheck: {
    fontSize: 24,
    color: colors.brand[700],
    fontFamily: 'Montserrat-Bold',
  },
  successTitle: {
    fontSize: 22, fontFamily: 'Montserrat-Bold', color: colors.ink[900],
  },
  successSub: {
    fontSize: 14, fontFamily: 'Montserrat-Regular', color: colors.slate[500], textAlign: 'center',
  },
});
