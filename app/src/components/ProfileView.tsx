import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/admin/people';
import { Button, Txt } from '@/components/ui';
import { getBaseUrl } from '@/lib/api';
import { colors, gradients, radius, shadow, space } from '@/lib/theme';

/** شاشة الحساب: ترويسة بصورة رمزية، وصفوف بيانات، وخروج. */
export function ProfileView({
  name,
  subtitle,
  rows,
  onLogout,
}: {
  name: string;
  subtitle?: string | null;
  rows: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value?: string | null }[];
  onLogout: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xl * 2 }}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.head}>
        <View style={styles.ring}>
          <Avatar name={name} size={84} />
        </View>
        <Txt weight="heavy" size={20} color="#fff" style={{ textAlign: 'center' }}>
          {name}
        </Txt>
        {subtitle ? (
          <Txt weight="bold" size={13} color="#c7d2fe" style={{ textAlign: 'center' }}>
            {subtitle}
          </Txt>
        ) : null}
      </LinearGradient>

      <View style={{ padding: space.lg, gap: space.lg }}>
        <View style={styles.list}>
          {rows.map((r, i) => (
            <View key={r.label}>
              {i ? <View style={styles.hair} /> : null}
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons name={r.icon} size={18} color={colors.primary} />
                </View>
                <Txt weight="bold" size={13} color={colors.muted} style={{ flex: 1 }}>
                  {r.label}
                </Txt>
                <Txt weight="heavy" size={14} color={r.value ? colors.ink : '#c3cadb'} style={{ flex: 1.4, textAlign: 'left' }} selectable>
                  {r.value || '—'}
                </Txt>
              </View>
            </View>
          ))}
        </View>
        <Txt size={11} color={colors.muted} weight="bold" style={{ textAlign: 'center' }}>
          الخادم: {getBaseUrl()}
        </Txt>
        <Button title="تسجيل الخروج" onPress={onLogout} tone="danger" icon="log-out-outline" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 6, paddingTop: space.lg, paddingBottom: space.xl * 1.5, borderBottomStartRadius: 32, borderBottomEndRadius: 32 },
  ring: { padding: 4, borderRadius: 52, borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)', marginBottom: space.sm },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginHorizontal: space.lg },
});
