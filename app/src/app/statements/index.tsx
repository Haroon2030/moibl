import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Card, ListScreen, Txt } from '@/components/ui';
import { api, Statement } from '@/lib/api';
import { date, money } from '@/lib/format';
import { colors } from '@/lib/theme';
import { Tone } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

const toneFor = (type: string): Tone => (type === 'warning' || type === 'final_warning' || type === 'penalty' ? 'bad' : 'info');

export default function Statements() {
  const router = useRouter();
  const state = useApi(api.statements);
  return (
    <>
      <Stack.Screen options={{ title: 'الإفادات' }} />
      <ListScreen
        state={state}
        items={state.data?.results ?? []}
        emptyText="لا توجد إفادات مسجّلة."
        renderItem={(s: Statement) => (
          <Card onPress={() => router.push(`/statements/${s.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt weight="heavy" size={16} color={colors.ink} style={{ flex: 1 }}>
                {s.title}
              </Txt>
              <Badge label={s.statement_type_display} tone={toneFor(s.statement_type)} />
            </View>
            <Txt size={12} color={colors.muted} weight="bold">
              {date(s.statement_date)} · {s.serial_number}
            </Txt>
            {Number(s.deduction_amount) > 0 ? (
              <Txt size={13} weight="bold" color={colors.bad}>
                خصم {money(s.deduction_amount)}
              </Txt>
            ) : null}
          </Card>
        )}
      />
    </>
  );
}
