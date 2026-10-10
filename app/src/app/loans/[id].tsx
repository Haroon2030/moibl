import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Card, DetailScreen, Field, SectionTitle, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { date, loanTone, money } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

export default function LoanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useApi(() => api.loan(Number(id)));
  const l = state.data;
  return (
    <>
      <Stack.Screen options={{ title: 'تفاصيل السلفة' }} />
      <DetailScreen state={state}>
        {l ? (
          <>
            <Card style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt weight="heavy" size={22} color={colors.ink}>
                  {money(l.amount)}
                </Txt>
                <Badge label={l.status_display} tone={loanTone(l.status)} />
              </View>
              <Field label="رقم السلفة" value={l.serial_number} />
              <Field label="القسط الشهري" value={money(l.monthly_deduction)} />
              <Field label="عدد الأقساط" value={String(l.installments)} />
              <Field label="المتبقي" value={money(l.remaining_balance)} />
              <Field label="تاريخ الصرف" value={date(l.issued_at)} />
              <Field label="أول خصم" value={date(l.first_deduction_date)} />
              {l.reason ? <Field label="السبب" value={l.reason} /> : null}
            </Card>

            <SectionTitle>جدول الأقساط</SectionTitle>
            <Card style={{ gap: 0, padding: 0 }}>
              {l.installments_log.length === 0 ? (
                <View style={{ padding: space.lg }}>
                  <Txt color={colors.muted} weight="bold">
                    لا يوجد جدول أقساط لهذه السلفة.
                  </Txt>
                </View>
              ) : (
                l.installments_log.map((i, idx) => (
                  <View
                    key={i.period}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: space.md,
                      borderTopWidth: idx ? 1 : 0,
                      borderTopColor: colors.line,
                    }}
                  >
                    <View>
                      <Txt weight="bold" color={colors.ink}>
                        {i.period}
                      </Txt>
                      <Txt size={12} color={colors.muted}>
                        استحقاق {date(i.due_date)}
                      </Txt>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Txt weight="bold" color={colors.ink}>
                        {money(i.amount)}
                      </Txt>
                      <Badge label={i.status_display} tone={loanTone(i.status)} />
                    </View>
                  </View>
                ))
              )}
            </Card>
          </>
        ) : null}
      </DetailScreen>
    </>
  );
}
