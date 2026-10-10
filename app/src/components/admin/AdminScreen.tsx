import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { colors, gradients, radius, space } from '@/lib/theme';

import { useDrawer } from './Drawer';

/** ترويسة متدرجة بزر القائمة (أو زر رجوع) وعنوان. */
export function AdminHeader({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const drawer = useDrawer();
  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.head, { paddingTop: insets.top + space.md }]}>
      <View style={styles.row}>
        <Pressable
          onPress={back ? () => router.back() : drawer.open}
          accessibilityRole="button"
          accessibilityLabel={back ? 'رجوع' : 'فتح القائمة'}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name={back ? 'arrow-forward' : 'menu'} size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt weight="heavy" size={19} color="#fff" numberOfLines={1}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt weight="bold" size={12} color="#bfdbfe" numberOfLines={1}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
      </View>
      {children}
    </LinearGradient>
  );
}

/** حاوية شاشة أدمن: ترويسة + محتوى. */
export function AdminScreen({
  title,
  subtitle,
  back,
  header,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AdminHeader title={title} subtitle={subtitle} back={back}>
        {header}
      </AdminHeader>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomStartRadius: radius.lg + 8,
    borderBottomEndRadius: radius.lg + 8,
    gap: space.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
});
