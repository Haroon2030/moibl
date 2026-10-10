import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/RequestUi';
import { Button, Card, ErrorView, Loading, TextField, Txt } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { confirmDialog, notify } from '@/lib/dialog';
import { money, toLatinDigits } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

export default function NewLoanRequest() {
  const router = useRouter();
  const options = useApi(api.requestOptions);
  const [amountText, setAmountText] = useState('');
  const [installments, setInstallments] = useState(1);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const o = options.data;
  if (options.loading && !o) return <Loading />;
  if (options.error && !o) return <ErrorView message={options.error} onRetry={options.reload} />;

  const maxInstallments = o?.loan.max_installments ?? 60;
  const amount = Number(toLatinDigits(amountText));
  const amountOk = Number.isFinite(amount) && amount > 0;
  // نفس حساب الخادم: القسط = المبلغ ÷ الأقساط مقرّبًا لأعلى، والقسط الأخير يبقى موجبًا
  const monthly = amountOk ? Math.ceil((amount / installments) * 100) / 100 : 0;
  const lastOk = installments === 1 || monthly * (installments - 1) < amount;
  const hasOpen = !!o?.loan.open_request;
  const blocked = hasOpen || !amountOk || !lastOk || !reason.trim();

  const submit = async () => {
    setError(null);
    const ok = await confirmDialog(
      'تأكيد طلب السلفة',
      `المبلغ: ${money(amount)}\nعدد الأقساط: ${installments}\nالقسط الشهري: ${money(monthly)}`,
      'إرسال الطلب',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api.submitLoan({ amount: amount.toFixed(2), installments, reason: reason.trim() });
      await notify('تم إرسال الطلب', 'وصل طلب السلفة إلى مدير الفرع للموافقة. تابع حالته من «طلباتي».');
      router.replace('/(employee)/requests');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'تعذّر إرسال الطلب.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'طلب سلفة' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 }} keyboardShouldPersistTaps="handled">
          {hasOpen ? <Banner tone="warn" text="لديك طلب سلفة قيد الموافقة. انتظر البت فيه قبل تقديم طلب جديد." /> : null}

          <TextField
            label="مبلغ السلفة (ر.س)"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="مثال: 3000"
            maxLength={12}
          />

          <View style={{ gap: 6 }}>
            <Txt size={13} weight="bold" color={colors.muted}>
              عدد الأقساط الشهرية
            </Txt>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setInstallments((n) => Math.max(1, n - 1))}
                disabled={installments <= 1}
                accessibilityRole="button"
                accessibilityLabel="تقليل الأقساط"
                style={[styles.stepBtn, installments <= 1 && { opacity: 0.4 }]}
              >
                <Ionicons name="remove" size={22} color={colors.primary} />
              </Pressable>
              <Txt weight="heavy" size={22} color={colors.ink} style={{ minWidth: 48, textAlign: 'center' }}>
                {installments}
              </Txt>
              <Pressable
                onPress={() => setInstallments((n) => Math.min(maxInstallments, n + 1))}
                disabled={installments >= maxInstallments}
                accessibilityRole="button"
                accessibilityLabel="زيادة الأقساط"
                style={[styles.stepBtn, installments >= maxInstallments && { opacity: 0.4 }]}
              >
                <Ionicons name="add" size={22} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <Card style={{ gap: space.sm }}>
            <Row label="المبلغ" value={amountOk ? money(amount) : '—'} />
            <Row label="القسط الشهري" value={amountOk && lastOk ? money(monthly) : '—'} strong />
            <Row label="مدة السداد" value={`${installments} شهر`} />
          </Card>
          {amountOk && !lastOk ? <Banner tone="bad" text="عدد الأقساط كبير بالنسبة للمبلغ. قلّل عدد الأقساط." /> : null}

          <TextField label="سبب السلفة" value={reason} onChangeText={setReason} multiline maxLength={500} placeholder="اذكر سبب طلب السلفة" />

          {error ? <Banner tone="bad" text={error} /> : null}
          <Button title="إرسال الطلب" icon="paper-plane-outline" onPress={submit} loading={busy} disabled={blocked} />
          <Txt size={12} color={colors.muted} weight="bold" style={{ textAlign: 'center' }}>
            لا تُصرف السلفة إلا بعد اعتماد الطلب في مسار الموافقات. وتُخصم أقساطها من راتبك.
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Txt weight="bold" color={colors.muted}>
        {label}
      </Txt>
      <Txt weight={strong ? 'heavy' : 'bold'} size={strong ? 18 : 15} color={strong ? colors.primary : colors.ink}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
