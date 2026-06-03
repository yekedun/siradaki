import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  MessageSquare,
  MoreVertical,
  Phone,
  Scissors,
  User,
  X,
} from 'lucide-react-native';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { v2Colors, v2Fonts, v2Radii } from '../lib/v2-tokens';

function toWAPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '90' + digits.slice(1);
  if (digits.length === 10) return '90' + digits;
  return digits;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export interface AppointmentDetail {
  id: string;
  time: string;
  duration: number;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  staffName?: string | null;
  notes?: string | null;
}

interface AppointmentDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  appointment: AppointmentDetail | null;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}

export function AppointmentDetailSheet({
  visible,
  onClose,
  appointment,
  onCancel,
  onComplete,
}: AppointmentDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  if (!appointment) return null;

  const appt = appointment;
  const hasPhone = !!appt.customerPhone;

  function handleCall() {
    if (!hasPhone) return;
    Linking.openURL(`tel:${appt.customerPhone}`);
  }

  async function doCancel(withWhatsApp: boolean) {
    setBusy(true);
    const { error: fnError } = await supabase.functions.invoke(
      'staff-cancel-appointment',
      { body: { appointment_id: appt.id } },
    );
    setBusy(false);
    if (fnError) {
      Alert.alert('Hata', 'Randevu iptal edilemedi. Lütfen tekrar deneyin.');
      return;
    }
    onCancel(appt.id);
    onClose();
    if (withWhatsApp && appt.customerPhone) {
      const phone = toWAPhone(appt.customerPhone);
      const msg = `Merhaba ${appt.customerName}, ${appt.time} saatindeki ${appt.serviceName} randevunuz iptal edilmiştir. Yeni randevu almak için lütfen iletişime geçin.`;
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`).catch(() => {});
    }
  }

  function handleCancel() {
    Alert.alert(
      'Randevuyu İptal Et',
      `${appt.customerName} için randevuyu iptal etmek istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: hasPhone ? "WhatsApp'tan Bildir ve İptal Et" : 'İptal Et',
          style: 'destructive',
          onPress: () => doCancel(hasPhone),
        },
      ],
    );
  }

  async function handleComplete() {
    setBusy(true);
    const { error } = await supabase.rpc('complete_appointment_with_revenue', {
      p_appointment_id: appt.id,
    });
    setBusy(false);
    if (error) {
      Alert.alert('Hata', error.message);
      return;
    }
    onComplete(appt.id);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Pressable style={styles.headerButton} onPress={onClose}>
              <ChevronLeft size={18} color={v2Colors.ink2} strokeWidth={2.2} />
            </Pressable>
            <Text style={styles.title}>Randevu Detayı</Text>
            <Pressable style={styles.headerButton} onPress={onClose}>
              <MoreVertical size={17} color={v2Colors.ink2} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Devam Ediyor</Text>
            </View>
            <Text style={styles.timeText}>{appt.time} · {appt.duration} dk</Text>
          </View>

          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(appt.customerName)}</Text>
            </View>
            <View style={styles.customerCopy}>
              <Text style={styles.customerName}>{appt.customerName}</Text>
              <Text style={styles.phoneText}>{appt.customerPhone ?? 'Telefon eklenmemiş'}</Text>
            </View>
            <View style={styles.visitBadge}>
              <Text style={styles.visitText}>3. Randevu</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Scissors size={15} color={v2Colors.spruce} strokeWidth={2.2} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Hizmet</Text>
              <Text style={styles.detailValue}>{appt.serviceName}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <User size={15} color={v2Colors.spruce} strokeWidth={2.2} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Usta</Text>
              <Text style={styles.detailValue}>{appt.staffName ?? 'Usta bilgisi yok'}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MessageSquare size={15} color={v2Colors.spruce} strokeWidth={2.2} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Not</Text>
              <Text style={[styles.noteValue, !appt.notes && styles.noteEmpty]}>
                {appt.notes || 'Not eklenmemiş'}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.footerButton, styles.completeButton, busy && styles.disabledButton]}
              disabled={busy}
              onPress={handleComplete}
            >
              <CheckCircle2 size={15} color={v2Colors.paper} strokeWidth={2.2} />
              <Text style={styles.completeText}>{busy ? '…' : 'Tamamlandı'}</Text>
            </Pressable>
            <Pressable
              style={[styles.footerButton, styles.callButton, (!hasPhone || busy) && styles.disabledButton]}
              disabled={!hasPhone || busy}
              onPress={handleCall}
            >
              <Phone size={15} color={v2Colors.ink2} strokeWidth={2.2} />
              <Text style={styles.callText}>Ara</Text>
            </Pressable>
            <Pressable
              style={[styles.footerButton, styles.cancelButton, busy && styles.disabledButton]}
              disabled={busy}
              onPress={handleCancel}
            >
              <X size={15} color={v2Colors.brick} strokeWidth={2.4} />
              <Text style={styles.cancelText}>İptal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(27,24,19,0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: v2Colors.paper,
    borderTopLeftRadius: v2Radii.sheet,
    borderTopRightRadius: v2Radii.sheet,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: v2Colors.line2,
    borderRadius: 3,
    height: 5,
    marginBottom: 3,
    marginTop: 11,
    width: 38,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: v2Colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 11,
    paddingBottom: 11,
    paddingHorizontal: 15,
    paddingTop: 5,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: v2Colors.paper2,
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: {
    color: v2Colors.ink,
    flex: 1,
    fontFamily: v2Fonts.display,
    fontSize: 18,
    textAlign: 'center',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 17,
    paddingTop: 12,
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: v2Colors.emberSoft,
    borderRadius: v2Radii.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusDot: {
    backgroundColor: v2Colors.ember,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  statusText: {
    color: v2Colors.ember,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  timeText: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.mono,
    fontSize: 11,
  },
  customerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 17,
    paddingTop: 18,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: v2Colors.paper2,
    borderColor: v2Colors.line,
    borderRadius: 13,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 12,
  },
  customerCopy: {
    flex: 1,
  },
  customerName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 16,
  },
  phoneText: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.mono,
    fontSize: 11,
    marginTop: 3,
  },
  visitBadge: {
    backgroundColor: v2Colors.spruceSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  visitText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  detailRow: {
    alignItems: 'center',
    borderTopColor: v2Colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginHorizontal: 17,
    paddingVertical: 10,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: v2Colors.paper2,
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  detailCopy: {
    flex: 1,
  },
  detailLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 13,
    marginTop: 3,
  },
  noteValue: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.body,
    fontSize: 13,
    marginTop: 3,
  },
  noteEmpty: {
    color: v2Colors.ink3,
    fontStyle: 'italic',
  },
  footer: {
    borderTopColor: v2Colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 15,
    paddingTop: 12,
  },
  footerButton: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  completeButton: {
    backgroundColor: v2Colors.spruce,
    borderColor: v2Colors.spruce,
  },
  completeText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 13,
  },
  callButton: {
    backgroundColor: v2Colors.paper,
    borderColor: v2Colors.line2,
  },
  callText: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 13,
  },
  cancelButton: {
    backgroundColor: v2Colors.brickSoft,
    borderColor: '#E4C9C3',
  },
  cancelText: {
    color: v2Colors.brick,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 13,
  },
});
