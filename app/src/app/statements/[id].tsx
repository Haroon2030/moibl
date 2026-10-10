import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Badge, Card, DetailScreen, Field, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { date, money } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

export default function StatementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useApi(() => api.statement(Number(id)));
  const s = state.data;
  return (
    <>
      <Stack.Screen options={{ title: 'تفاصيل الإفادة' }} />
      <DetailScreen state={state}>
        {s ? (
          <Card style={{ gap: space.md }}>
            <Txt weight="heavy" size={18} color={colors.ink}>
              {s.title}
            </Txt>
            <Badge label={s.statement_type_display} tone="info" />
            <Field label="التاريخ" value={date(s.statement_date)} />
            <Field label="رقم الإفادة" value={s.serial_number} />
            {Number(s.deduction_amount) > 0 ? <Field label="الخصم" value={money(s.deduction_amount)} tone="bad" /> : null}
            {s.content ? (
              <Txt color={colors.text} style={{ lineHeight: 26 }}>
                {s.content}
              </Txt>
            ) : null}
          </Card>
        ) : null}
      </DetailScreen>
    </>
  );
}
