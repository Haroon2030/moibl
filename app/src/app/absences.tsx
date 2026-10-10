import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Card, Field, ListScreen, Txt } from '@/components/ui';
import { Absence, api } from '@/lib/api';
import { date, money } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

export default function Absences() {
  const state = useApi(api.absences);
  return (
    <>
      <Stack.Screen options={{ title: 'الغيابات' }} />
      <ListScreen
        state={state}
        items={state.data?.results ?? []}
        emptyText="لا توجد غيابات مسجّلة."
        renderItem={(a: Absence) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt weight="heavy" size={16} color={colors.ink}>
                {date(a.absence_date)}
              </Txt>
              <Badge label={`${a.days} يوم`} tone="warn" />
            </View>
            <View style={{ flexDirection: 'row', gap: space.xl }}>
              <Field label="الخصم" value={money(a.deduction_amount)} tone="bad" />
              <Field label="رقم السجل" value={a.serial_number} />
            </View>
            {a.reason ? <Field label="السبب" value={a.reason} /> : null}
          </Card>
        )}
      />
    </>
  );
}
