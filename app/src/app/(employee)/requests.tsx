import React from 'react';
import { View } from 'react-native';

import { Badge, Card, Field, ListScreen, Txt } from '@/components/ui';
import { ActionItem, api } from '@/lib/api';
import { date, statusTone } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

export default function MyRequests() {
  const state = useApi(api.myRequests);
  return (
    <ListScreen
      state={state}
      items={state.data?.results ?? []}
      emptyText="لا توجد طلبات مسجّلة باسمك بعد."
      renderItem={(a: ActionItem) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt weight="heavy" size={16} color={colors.ink}>
              {a.type_display}
            </Txt>
            <Badge label={a.status_display} tone={statusTone(a.status)} />
          </View>
          <Txt size={12} color={colors.muted} weight="bold">
            رُفع بتاريخ {date(a.requested_at)}
          </Txt>
          {a.summary.length ? (
            <View style={{ marginTop: space.sm, gap: space.sm }}>
              {a.summary.map((s) => (
                <Field key={s.label} label={s.label} value={s.value} />
              ))}
            </View>
          ) : null}
        </Card>
      )}
    />
  );
}
