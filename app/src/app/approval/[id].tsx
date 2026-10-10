import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, DetailScreen, Field, SectionTitle, TextField, Txt } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { date, statusTone } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

type Action = 'approve' | 'return';

export default function ApprovalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const state = useApi(() => api.approval(Number(id)));
  const a = state.data;

  const [action, setAction] = useState<Action | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(next: Action) {
    setAction(next);
    setNotes('');
    setError(null);
  }

  async function confirm() {
    if (!action || busy) return;
    if (action === 'return' && !notes.trim()) {
      setError('ملاحظات الإرجاع إجبارية.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (action === 'approve') await api.approve(Number(id), notes.trim());
      else await api.returnApproval(Number(id), notes.trim());
      setAction(null);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'تعذّر إتمام العملية.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'تفاصيل الطلب' }} />
      <DetailScreen state={state}>
        {a ? (
          <>
            <Card style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt weight="heavy" size={18} color={colors.ink}>
                  {a.type_display}
                </Txt>
                <Badge label={a.status_display} tone={statusTone(a.status)} />
              </View>
              <Field label="الموظف" value={a.employee} />
              <Field label="الفرع" value={a.branch} />
              <Field label="رفعه" value={a.requested_by} />
              <Field label="تاريخ الطلب" value={date(a.requested_at)} />
              {a.branch_notes ? <Field label="ملاحظات سابقة" value={a.branch_notes} /> : null}
            </Card>

            {a.summary.length ? (
              <>
                <SectionTitle>بيانات الطلب</SectionTitle>
                <Card style={{ gap: space.md }}>
                  {a.summary.map((s) => (
                    <Field key={s.label} label={s.label} value={s.value} />
                  ))}
                </Card>
              </>
            ) : null}

            {a.can_approve || a.can_return ? (
              <View style={{ gap: space.md, marginTop: space.lg }}>
                {a.can_approve ? <Button title="اعتماد الطلب" icon="checkmark-circle-outline" onPress={() => open('approve')} /> : null}
                {a.can_return ? <Button title="إرجاع للتعديل" tone="danger" icon="return-up-back-outline" onPress={() => open('return')} /> : null}
              </View>
            ) : (
              <Card style={{ marginTop: space.lg, backgroundColor: colors.neutralSoft }}>
                <Txt weight="bold" color={colors.muted}>
                  لا يمكنك اتخاذ إجراء على هذا الطلب في مرحلته الحالية.
                </Txt>
              </Card>
            )}
          </>
        ) : null}
      </DetailScreen>

      <Modal visible={action !== null} transparent animationType="fade" onRequestClose={() => setAction(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Txt weight="heavy" size={18} color={colors.ink}>
              {action === 'approve' ? 'اعتماد الطلب' : 'إرجاع الطلب للتعديل'}
            </Txt>
            <Txt size={13} color={colors.muted} weight="bold">
              {action === 'approve'
                ? 'سيُحوَّل الطلب للمرحلة التالية (المدير العام).'
                : 'سيعود الطلب لمن رفعه مع ملاحظاتك، وهي إجبارية.'}
            </Txt>
            <TextField
              label={action === 'approve' ? 'ملاحظات (اختياري)' : 'ملاحظات الإرجاع'}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            {error ? (
              <Txt weight="bold" color={colors.bad} size={13} accessibilityRole="alert">
                {error}
              </Txt>
            ) : null}
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Button title="تأكيد" onPress={confirm} loading={busy} tone={action === 'return' ? 'danger' : 'primary'} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="إلغاء" onPress={() => setAction(null)} tone="ghost" disabled={busy} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: space.lg },
  sheet: { backgroundColor: '#fff', borderRadius: radius.lg, padding: space.lg, gap: space.md },
});
