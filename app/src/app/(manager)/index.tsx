import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, Field, ListScreen, Txt } from '@/components/ui';
import { api, Approval } from '@/lib/api';
import { date, statusTone } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';
import { useApi } from '@/lib/useApi';

type Scope = 'pending' | 'all';

export default function Approvals() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('pending');
  const state = useApi(() => api.approvals(scope));
  const first = useRef(true);

  // عند تبديل التبويب (بانتظاري/الكل) نعيد الجلب
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void state.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  return (
    <ListScreen
      state={state}
      items={state.data?.results ?? []}
      emptyText={scope === 'pending' ? 'لا توجد طلبات بانتظار موافقتك.' : 'لا توجد طلبات.'}
      header={
        <View style={styles.segment} accessibilityRole="tablist">
          {(
            [
              ['pending', 'بانتظار موافقتي'],
              ['all', 'كل الطلبات'],
            ] as [Scope, string][]
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setScope(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === key }}
              style={[styles.segmentItem, scope === key && styles.segmentActive]}
            >
              <Txt weight="bold" color={scope === key ? colors.primary : colors.muted}>
                {label}
              </Txt>
            </Pressable>
          ))}
        </View>
      }
      renderItem={(a: Approval) => (
        <Card onPress={() => router.push(`/approval/${a.id}`)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt weight="heavy" size={16} color={colors.ink}>
              {a.type_display}
            </Txt>
            <Badge label={a.status_display} tone={statusTone(a.status)} />
          </View>
          <Txt weight="bold" color={colors.text}>
            {a.employee}
          </Txt>
          <Txt size={12} color={colors.muted} weight="bold">
            {a.branch} · {date(a.requested_at)}
          </Txt>
          {a.summary.slice(0, 2).map((s) => (
            <Field key={s.label} label={s.label} value={s.value} />
          ))}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: radius.md, padding: 4, marginBottom: space.lg },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: '#fff' },
});
