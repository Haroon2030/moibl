import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Card, DetailScreen, Field, SectionTitle, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { date, money } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

export default function Salary() {
  const state = useApi(api.salary);
  const d = state.data;
  return (
    <>
      <Stack.Screen options={{ title: 'تعديل الراتب' }} />
      <DetailScreen state={state}>
        {d ? (
          <>
            <Card style={{ gap: space.md }}>
              <Field label="الراتب الأساسي الحالي" value={money(d.current.basic_salary)} />
              <Field label="إجمالي الراتب" value={money(d.current.total_salary)} />
            </Card>

            <SectionTitle>سجل التعديلات</SectionTitle>
            {d.changes.length === 0 ? (
              <Card>
                <Txt color={colors.muted} weight="bold">
                  لا توجد تعديلات مسجّلة على الراتب.
                </Txt>
              </Card>
            ) : (
              <View style={{ gap: space.md }}>
                {d.changes.map((c) => {
                  const diff = Number(c.difference);
                  return (
                    <Card key={c.id}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Txt weight="heavy" color={colors.ink}>
                          سريان {date(c.effective_date)}
                        </Txt>
                        <Badge label={c.applied ? 'مطبّق' : 'بانتظار الشهر'} tone={c.applied ? 'good' : 'warn'} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: space.xl, marginTop: space.xs }}>
                        <Field label="السابق" value={money(c.old_basic_salary)} />
                        <Field label="الجديد" value={money(c.new_basic_salary)} />
                        <Field label="الفرق" value={money(c.difference)} tone={diff > 0 ? 'good' : diff < 0 ? 'bad' : undefined} />
                      </View>
                      {c.reason ? <Field label="السبب" value={c.reason} /> : null}
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        ) : null}
      </DetailScreen>
    </>
  );
}
