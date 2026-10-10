import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Card, Field, ListScreen, Txt } from '@/components/ui';
import { api, LeavesData } from '@/lib/api';
import { date, num } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

export default function Leaves() {
  const state = useApi(api.leaves);
  const data = state.data;
  return (
    <>
      <Stack.Screen options={{ title: 'الإجازات' }} />
      <ListScreen
        state={state}
        items={data?.results ?? []}
        emptyText="لا توجد إجازات مسجّلة."
        header={
          data ? (
            <Card style={{ flexDirection: 'row', gap: space.xl, marginBottom: space.md }}>
              <Field label="المستحق (يوم)" value={num(data.balance.accrued)} />
              <Field label="المتبقي (يوم)" value={num(data.balance.remaining)} tone="good" />
            </Card>
          ) : null
        }
        renderItem={(l: LeavesData['results'][number]) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt weight="heavy" size={16} color={colors.ink}>
                {l.leave_type_display}
              </Txt>
              <Badge label={`${num(l.days)} يوم`} tone="info" />
            </View>
            <View style={{ flexDirection: 'row', gap: space.xl }}>
              <Field label="من" value={date(l.date_from)} />
              <Field label="إلى" value={date(l.date_to)} />
            </View>
            {l.notes ? <Field label="ملاحظات" value={l.notes} /> : null}
          </Card>
        )}
      />
    </>
  );
}
