import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, Txt } from '@/components/ui';
import { colors, radius, space } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SERVICES: { href: string; icon: IconName; title: string; hint: string }[] = [
  { href: '/loans', icon: 'cash-outline', title: 'السلف', hint: 'السلف والأقساط المتبقية' },
  { href: '/salary', icon: 'trending-up-outline', title: 'تعديل الراتب', hint: 'الراتب الحالي وسجل التعديلات' },
  { href: '/leaves', icon: 'calendar-outline', title: 'الإجازات', hint: 'رصيدك وإجازاتك السابقة' },
  { href: '/absences', icon: 'person-remove-outline', title: 'الغيابات', hint: 'سجل الغياب والخصومات' },
  { href: '/statements', icon: 'document-text-outline', title: 'الإفادات', hint: 'الإفادات والإنذارات' },
];

const NEW_REQUESTS: { href: string; icon: IconName; title: string; hint: string; tint: string }[] = [
  { href: '/request/leave', icon: 'airplane-outline', title: 'طلب إجازة', hint: 'قدّم إجازة وتابع موافقتها', tint: '#047857' },
  { href: '/request/loan', icon: 'wallet-outline', title: 'طلب سلفة', hint: 'اطلب سلفة وقسّطها على راتبك', tint: '#2563eb' },
];

export default function Services() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <Txt weight="heavy" size={15} color={colors.muted}>
        طلب جديد
      </Txt>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {NEW_REQUESTS.map((n) => (
          <Pressable
            key={n.href}
            onPress={() => router.push(n.href as never)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.newCard, { backgroundColor: n.tint }, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={n.icon} size={28} color="#fff" />
            <View>
              <Txt weight="heavy" size={16} color="#fff">
                {n.title}
              </Txt>
              <Txt weight="bold" size={11} color="rgba(255,255,255,0.85)">
                {n.hint}
              </Txt>
            </View>
          </Pressable>
        ))}
      </View>
      <Txt weight="heavy" size={15} color={colors.muted} style={{ marginTop: space.md }}>
        بياناتي
      </Txt>
      {SERVICES.map((s) => (
        <Card key={s.href} onPress={() => router.push(s.href as never)} style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name={s.icon} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="heavy" size={16} color={colors.ink}>
              {s.title}
            </Txt>
            <Txt size={12} color={colors.muted} weight="bold">
              {s.hint}
            </Txt>
          </View>
          <Ionicons name="chevron-back" size={20} color="#94a3b8" />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  newCard: { flex: 1, minHeight: 120, borderRadius: radius.lg, padding: space.lg, justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
