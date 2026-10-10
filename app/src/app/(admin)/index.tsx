import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AdminScreen } from '@/components/admin/AdminScreen';
import { Slide, Slider } from '@/components/admin/Slider';
import { Card, ErrorView, Loading, Txt } from '@/components/ui';
import { api, CountRow, EmployeesOverview } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { num } from '@/lib/format';
import { colors, gradients, radius, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

function buildSlides(o: EmployeesOverview): Slide[] {
  const st = (key: string) => o.statuses.find((s) => s.key === key)?.count ?? 0;
  const e = o.expiring;
  return [
    {
      key: 'total',
      title: 'إجمالي الموظفين',
      icon: 'people',
      gradient: gradients.hero,
      big: num(o.total),
      caption: `${num(o.working)} على رأس العمل حاليًا`,
      stats: [
        { label: 'ذكور', value: num(o.male) },
        { label: 'إناث', value: num(o.female) },
        { label: 'منتهي الخدمة', value: num(st('terminated')) },
      ],
    },
    {
      key: 'status',
      title: 'حالات الموظفين',
      icon: 'pulse',
      gradient: gradients.emerald,
      big: num(st('active')),
      caption: 'على رأس العمل',
      stats: [
        { label: 'في إجازة', value: num(st('leave')) },
        { label: 'موقوف', value: num(st('suspended')) },
        { label: 'منتهي', value: num(st('terminated')) },
      ],
    },
    {
      key: 'expiry',
      title: `تنبيهات خلال ${e.window_days} يومًا`,
      icon: 'alarm',
      gradient: gradients.amber,
      big: num(e.contract + e.medical_insurance + e.health_card),
      caption: 'وثائق تقترب من الانتهاء أو منتهية',
      stats: [
        { label: 'العقود', value: num(e.contract) },
        { label: 'التأمين الطبي', value: num(e.medical_insurance) },
        { label: 'الكرت الصحي', value: num(e.health_card) },
      ],
    },
    {
      key: 'hires',
      title: 'التعيينات الجديدة',
      icon: 'person-add',
      gradient: gradients.violet,
      big: num(o.hired_last_30),
      caption: 'موظف باشر خلال آخر 30 يومًا',
      stats: [
        { label: 'الفروع', value: num(o.by_branch.length) },
        { label: 'الأقسام', value: num(o.by_department.length) },
        { label: 'الجنسيات', value: num(o.by_nationality.length) },
      ],
    },
  ];
}

function Bars({ title, icon, rows, tint }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; rows: CountRow[]; tint: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.cardHead}>
        <View style={[styles.cardIcon, { backgroundColor: tint + '22' }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Txt weight="heavy" size={16} color={colors.ink}>
          {title}
        </Txt>
      </View>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 4 }}>
          <View style={styles.barLabel}>
            <Txt weight="bold" size={13} color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
              {r.label}
            </Txt>
            <Txt weight="heavy" size={13} color={colors.ink}>
              {num(r.count)}
            </Txt>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(4, (r.count / max) * 100)}%`, backgroundColor: tint }]} />
          </View>
        </View>
      ))}
    </Card>
  );
}

function Tile({
  title,
  hint,
  icon,
  colorsPair,
  onPress,
}: {
  title: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colorsPair: readonly [string, string, ...string[]];
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.85 }]}>
      <LinearGradient colors={colorsPair} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
        <Ionicons name={icon} size={26} color="#fff" />
        <View>
          <Txt weight="heavy" size={15} color="#fff">
            {title}
          </Txt>
          <Txt weight="bold" size={11} color="rgba(255,255,255,0.85)">
            {hint}
          </Txt>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { session } = useAuth();
  const state = useApi(api.adminOverview);
  const name = session.status === 'manager' ? session.profile.name : '';
  const o = state.data;

  return (
    <AdminScreen title={`مرحبًا ${name.split(' ')[0] ?? ''}`} subtitle="لوحة التحكم · بيانات الموظفين">
      {state.loading && !o ? (
        <Loading />
      ) : state.error && !o ? (
        <ErrorView message={state.error} onRetry={state.reload} />
      ) : o ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.xl * 2, gap: space.lg }}
          refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.primary} />}
        >
          <Slider slides={buildSlides(o)} />

          <View style={[styles.tiles, { paddingHorizontal: space.lg }]}>
            <Tile title="بيانات الموظفين" hint={`${num(o.total)} موظف`} icon="people" colorsPair={gradients.sky} onPress={() => router.push('/(admin)/employees')} />
            <Tile title="الموافقات" hint="الطلبات المعلّقة" icon="checkmark-done" colorsPair={gradients.rose} onPress={() => router.push('/(admin)/approvals')} />
          </View>

          <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
            <Bars title="الموظفون حسب الفرع" icon="storefront-outline" rows={o.by_branch} tint="#2563eb" />
            <Bars title="الموظفون حسب القسم" icon="git-network-outline" rows={o.by_department} tint="#7c3aed" />
            <Bars title="الموظفون حسب الجنسية" icon="earth-outline" rows={o.by_nationality} tint="#059669" />
          </View>
        </ScrollView>
      ) : null}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { height: 110, borderRadius: radius.lg, padding: space.lg, justifyContent: 'space-between' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  barLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.neutralSoft, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
