import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/admin/people';
import { Badge, DetailScreen, Txt } from '@/components/ui';
import { api, Summary } from '@/lib/api';
import { date, money, num } from '@/lib/format';
import { colors, gradients, radius, shadow, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Metric({ label, value, tone, onPress }: { label: string; value: string; tone?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.metric, pressed && { opacity: 0.7 }]}>
      <Txt weight="heavy" size={26} color={tone ?? colors.ink} style={{ lineHeight: 34 }}>
        {value}
      </Txt>
      <Txt weight="bold" size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Action({ icon, title, tint, onPress }: { icon: IconName; title: string; tint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.actionIcon, { backgroundColor: tint + '1f' }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Txt weight="heavy" size={15} color={colors.ink} style={{ flex: 1 }}>
        {title}
      </Txt>
      <Ionicons name="add-circle" size={24} color={tint} />
    </Pressable>
  );
}

function Row({ icon, title, value, hint, onPress }: { icon: IconName; title: string; value: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primarySoft }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt weight="bold" size={14} color={colors.ink}>
          {title}
        </Txt>
        {hint ? (
          <Txt weight="bold" size={11} color={colors.muted}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <Txt weight="heavy" size={15} color={colors.ink}>
        {value}
      </Txt>
      <Ionicons name="chevron-back" size={18} color="#a3adc2" />
    </Pressable>
  );
}

export default function EmployeeHome() {
  const router = useRouter();
  const state = useApi<Summary>(api.summary);
  const s = state.data;

  return (
    <DetailScreen state={state}>
      {s ? (
        <View style={{ gap: space.lg }}>
          {/* بطاقة الموظف */}
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.idCard}>
            <View style={styles.ringA} />
            <View style={styles.ringB} />
            <View style={styles.idTop}>
              <Avatar name={s.profile.name} size={58} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight="heavy" size={19} color="#fff" numberOfLines={2}>
                  {s.profile.name}
                </Txt>
                <Txt weight="bold" size={13} color="#c7d2fe" numberOfLines={1}>
                  {[s.profile.profession, s.profile.branch].filter(Boolean).join(' · ') || '—'}
                </Txt>
              </View>
            </View>
            <View style={styles.idBottom}>
              <View>
                <Txt weight="bold" size={11} color="#a5b4fc">
                  الرقم الوظيفي
                </Txt>
                <Txt weight="heavy" size={20} color="#fff" style={{ letterSpacing: 1.5 }}>
                  {s.profile.employee_number || '—'}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={s.profile.status_display} tone={s.profile.status === 'active' ? 'good' : 'warn'} />
                {s.profile.hire_date ? (
                  <Txt weight="bold" size={11} color="#a5b4fc">
                    منذ {date(s.profile.hire_date)}
                  </Txt>
                ) : null}
              </View>
            </View>
          </LinearGradient>

          {/* ملخص */}
          <View style={styles.metrics}>
            <Metric label="رصيد الإجازة (يوم)" value={num(s.leave_balance)} tone={colors.good} onPress={() => router.push('/leaves')} />
            <View style={styles.sep} />
            <Metric label="سلف نشطة" value={String(s.active_loans)} onPress={() => router.push('/loans')} />
            <View style={styles.sep} />
            <Metric label="طلبات جارية" value={String(s.open_requests)} tone={s.open_requests ? colors.warn : undefined} onPress={() => router.push('/(employee)/requests')} />
          </View>

          {/* طلب جديد */}
          <View style={{ gap: space.sm }}>
            <Txt weight="heavy" size={16} color={colors.ink}>
              طلب جديد
            </Txt>
            <View style={{ gap: space.sm }}>
              <Action icon="airplane-outline" title="طلب إجازة" tint={colors.good} onPress={() => router.push('/request/leave')} />
              <Action icon="wallet-outline" title="طلب سلفة" tint={colors.primary} onPress={() => router.push('/request/loan')} />
            </View>
          </View>

          {/* بياناتي */}
          <View style={{ gap: space.sm }}>
            <Txt weight="heavy" size={16} color={colors.ink}>
              بياناتي
            </Txt>
            <View style={styles.list}>
              <Row
                icon="cash-outline"
                title="السلف"
                hint={s.active_loans ? `المتبقي ${money(s.loans_remaining)}` : 'لا توجد سلف نشطة'}
                value={String(s.active_loans)}
                onPress={() => router.push('/loans')}
              />
              <View style={styles.hair} />
              <Row
                icon="trending-up-outline"
                title="الراتب"
                hint={s.last_salary_change ? `آخر تعديل من ${date(s.last_salary_change.effective_date)}` : 'لا تعديلات مسجّلة'}
                value={s.last_salary_change ? money(s.last_salary_change.new_basic_salary) : '—'}
                onPress={() => router.push('/salary')}
              />
              <View style={styles.hair} />
              <Row icon="calendar-outline" title="الإجازات" hint="رصيدك وإجازاتك السابقة" value={`${num(s.leave_balance)} يوم`} onPress={() => router.push('/leaves')} />
            </View>
          </View>
        </View>
      ) : null}
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  idCard: { borderRadius: 24, padding: space.xl, gap: space.xl, overflow: 'hidden', ...shadow, shadowOpacity: 0.25, shadowRadius: 22 },
  ringA: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 32, borderColor: 'rgba(255,255,255,0.06)', top: -80, end: -70 },
  ringB: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 22, borderColor: 'rgba(255,255,255,0.05)', bottom: -50, start: -30 },
  idTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  idBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: space.md, ...shadow },
  metric: { flex: 1, alignItems: 'center', gap: 0, paddingVertical: 4, paddingHorizontal: 4 },
  sep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.line, marginVertical: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, ...shadow },
  actionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingHorizontal: space.lg },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginHorizontal: space.lg },
});
