import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { Banner } from '@/components/RequestUi';
import { Button, Card, ErrorView, Loading, TextField, Txt } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { confirmDialog, notify } from '@/lib/dialog';
import { date as fmtDate, isoDate, num } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function NewLeaveRequest() {
  const router = useRouter();
  const options = useApi(api.requestOptions);
  const [leaveType, setLeaveType] = useState('annual');
  const [from, setFrom] = useState<Date>(startOfToday);
  const [to, setTo] = useState<Date>(startOfToday);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => Math.round((to.getTime() - from.getTime()) / 86400000) + 1, [from, to]);
  const o = options.data;
  const balance = o?.leave.balance != null ? Number(o.leave.balance) : null;
  const overBalance = leaveType === 'annual' && balance !== null && days > balance;
  const invalidRange = days < 1;
  const noSponsor = !!o && !o.leave.has_sponsorship;
  const blocked = noSponsor || invalidRange || overBalance;

  if (options.loading && !o) return <Loading />;
  if (options.error && !o) return <ErrorView message={options.error} onRetry={options.reload} />;

  const typeLabel = o?.leave.types.find((t) => t.key === leaveType)?.label ?? '';

  const submit = async () => {
    setError(null);
    const ok = await confirmDialog(
      'تأكيد طلب الإجازة',
      `${typeLabel} · ${days} يوم\nمن ${fmtDate(isoDate(from))} إلى ${fmtDate(isoDate(to))}`,
      'إرسال الطلب',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api.submitLeave({ leave_type: leaveType, date_from: isoDate(from), date_to: isoDate(to), notes: notes.trim() });
      await notify('تم إرسال الطلب', 'وصل طلبك إلى مدير الفرع للموافقة. تابع حالته من «طلباتي».');
      router.replace('/(employee)/requests');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'تعذّر إرسال الطلب.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'طلب إجازة' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 }} keyboardShouldPersistTaps="handled">
          <Card style={styles.balance}>
            <Ionicons name="time-outline" size={26} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Txt size={12} weight="bold" color={colors.muted}>
                رصيد الإجازة السنوية
              </Txt>
              <Txt weight="heavy" size={20} color={colors.ink}>
                {balance === null ? '—' : `${num(balance)} يوم`}
              </Txt>
            </View>
          </Card>

          {noSponsor ? <Banner tone="bad" text="لا يمكن تقديم إجازة لأنك غير مُسجَّل على كفالة. تواصل مع الموارد البشرية." /> : null}

          <View style={{ gap: 6 }}>
            <Txt size={13} weight="bold" color={colors.muted}>
              نوع الإجازة
            </Txt>
            <View style={styles.chips}>
              {(o?.leave.types ?? []).map((t) => {
                const on = t.key === leaveType;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setLeaveType(t.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Txt weight="bold" size={13} color={on ? '#fff' : colors.text} style={{ lineHeight: 20 }}>
                      {t.label}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <DateField
            label="من تاريخ"
            value={from}
            onChange={(d) => {
              setFrom(d);
              if (d > to) setTo(d);
            }}
          />
          <DateField label="إلى تاريخ" value={to} minimumDate={from} onChange={setTo} />

          <Card style={styles.daysCard}>
            <Txt weight="bold" color={colors.muted}>
              مدة الإجازة
            </Txt>
            <Txt weight="heavy" size={20} color={overBalance || invalidRange ? colors.bad : colors.primary}>
              {invalidRange ? '—' : `${num(days)} يوم`}
            </Txt>
          </Card>
          {overBalance ? <Banner tone="bad" text={`الرصيد غير كافٍ: المتاح ${num(balance)} يوم والمطلوب ${num(days)} يوم.`} /> : null}

          <TextField label="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} multiline maxLength={500} placeholder="سبب الإجازة أو أي تفاصيل" />

          {error ? <Banner tone="bad" text={error} /> : null}
          <Button title="إرسال الطلب" icon="paper-plane-outline" onPress={submit} loading={busy} disabled={blocked} />
          <Txt size={12} color={colors.muted} weight="bold" style={{ textAlign: 'center' }}>
            يمرّ الطلب بمسار الموافقات (مدير الفرع ثم الموارد البشرية).
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  daysCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
