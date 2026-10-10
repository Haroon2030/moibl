import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Card, Field, ListScreen, Txt } from '@/components/ui';
import { api, Loan } from '@/lib/api';
import { date, loanTone, money } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

export default function Loans() {
  const router = useRouter();
  const state = useApi(api.loans);
  return (
    <>
      <Stack.Screen options={{ title: 'السلف' }} />
      <ListScreen
        state={state}
        items={state.data?.results ?? []}
        emptyText="لا توجد سلف مسجّلة."
        renderItem={(l: Loan) => (
          <Card onPress={() => router.push(`/loans/${l.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt weight="heavy" size={17} color={colors.ink}>
                {money(l.amount)}
              </Txt>
              <Badge label={l.status_display} tone={loanTone(l.status)} />
            </View>
            <Txt size={12} color={colors.muted} weight="bold">
              رقم {l.serial_number} · صُرفت {date(l.issued_at)}
            </Txt>
            <View style={{ flexDirection: 'row', gap: space.xl, marginTop: space.sm }}>
              <Field label="القسط الشهري" value={money(l.monthly_deduction)} />
              <Field label="المتبقي" value={money(l.remaining_balance)} tone={l.status === 'active' ? 'warn' : undefined} />
            </View>
          </Card>
        )}
      />
    </>
  );
}
