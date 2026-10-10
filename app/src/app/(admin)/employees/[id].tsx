import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, statusTone } from '@/components/admin/people';
import { Badge, Card, ErrorView, Loading, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { date } from '@/lib/format';
import { colors, gradients, radius, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';


type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Action({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, (disabled || pressed) && { opacity: disabled ? 0.4 : 0.8 }]}
    >
      <Ionicons name={icon} size={20} color="#fff" />
      <Txt weight="bold" size={12} color="#fff" style={{ lineHeight: 18 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function EmployeeProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const state = useApi(() => api.adminEmployee(Number(id)));
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const e = state.data;

  if (state.loading && !e) return <Loading />;
  if (state.error && !e) return <ErrorView message={state.error} onRetry={state.reload} />;
  if (!e) return null;

  const phone = e.phone?.trim();
  const wa = phone ? phone.replace(/^0/, '966').replace(/\D/g, '') : '';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingBottom: space.xl * 2 }}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.primary} />}
    >
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + space.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.back}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={styles.ring}>
            <Avatar name={e.name} size={88} />
          </View>
          <Txt weight="heavy" size={20} color="#fff" style={{ textAlign: 'center' }}>
            {e.name}
          </Txt>
          <Txt weight="bold" size={13} color="#bfdbfe" style={{ textAlign: 'center' }}>
            {[e.profession, e.branch].filter(Boolean).join(' · ') || '—'}
          </Txt>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Badge label={e.status_display} tone={statusTone(e.status)} />
            {e.employee_number ? (
              <View style={styles.numPill}>
                <Txt weight="bold" size={12} color="#fff" style={{ lineHeight: 18 }}>
                  #{e.employee_number}
                </Txt>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.actions}>
          <Action icon="call" label="اتصال" disabled={!phone} onPress={() => void Linking.openURL(`tel:${phone}`)} />
          <Action icon="logo-whatsapp" label="واتساب" disabled={!wa} onPress={() => void Linking.openURL(`https://wa.me/${wa}`)} />
          <Action icon="chatbubble-ellipses" label="رسالة" disabled={!phone} onPress={() => void Linking.openURL(`sms:${phone}`)} />
        </View>
      </LinearGradient>

      <View style={{ padding: space.lg, gap: space.lg }}>
        {e.hire_date ? (
          <Card style={styles.hireCard}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Txt weight="bold" color={colors.text}>
              مباشرة العمل: {date(e.hire_date)}
            </Txt>
          </Card>
        ) : null}

        {e.sections.map((s) => {
          const shut = closed[s.title];
          return (
            <Card key={s.title} style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
              <Pressable
                onPress={() => setClosed((c) => ({ ...c, [s.title]: !c[s.title] }))}
                accessibilityRole="button"
                accessibilityState={{ expanded: !shut }}
                style={styles.secHead}
              >
                <View style={styles.secIcon}>
                  <Ionicons name={s.icon as IconName} size={19} color={colors.primary} />
                </View>
                <Txt weight="heavy" size={16} color={colors.ink} style={{ flex: 1 }}>
                  {s.title}
                </Txt>
                <Ionicons name={shut ? 'chevron-down' : 'chevron-up'} size={20} color={colors.muted} />
              </Pressable>
              {shut ? null : (
                <View style={styles.rows}>
                  {s.rows.map((r) => (
                    <View key={r.label} style={styles.kv}>
                      <Txt weight="bold" size={13} color={colors.muted} style={{ flex: 1 }}>
                        {r.label}
                      </Txt>
                      <Txt weight="bold" size={14} color={r.value ? colors.ink : '#cbd5e1'} selectable style={{ flex: 1.3, textAlign: 'left' }}>
                        {r.value ?? '—'}
                      </Txt>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}

        {e.notes.map((n) => (
          <Card key={n.title}>
            <Txt weight="heavy" size={15} color={colors.ink}>
              {n.title}
            </Txt>
            <Txt color={colors.text} selectable>
              {n.text}
            </Txt>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.lg, paddingBottom: space.xl, borderBottomStartRadius: 32, borderBottomEndRadius: 32, gap: space.lg },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  ring: { padding: 4, borderRadius: 52, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  numPill: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: space.md, justifyContent: 'center' },
  action: { flex: 1, maxWidth: 110, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.16)' },
  hireCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  secIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rows: { borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: space.lg, paddingVertical: space.sm },
  kv: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
