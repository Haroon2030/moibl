import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, I18nManager, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { avatarColor, colors, gradients, radius, space } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface DrawerCtx {
  open: () => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerCtx>({ open: () => {}, close: () => {} });
export const useDrawer = () => useContext(DrawerContext);

interface NavItem {
  label: string;
  icon: IconName;
  href: string;
  /** المسار الذي يجعل العنصر نشطًا */
  match: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { label: 'لوحة التحكم', icon: 'grid-outline', href: '/(admin)', match: (p) => p === '/' || p === '/index' || p === '' },
  { label: 'بيانات الموظفين', icon: 'people-outline', href: '/(admin)/employees', match: (p) => p.startsWith('/employees') },
  { label: 'الموافقات', icon: 'checkmark-done-outline', href: '/(admin)/approvals', match: (p) => p.startsWith('/approvals') },
  { label: 'حسابي', icon: 'person-circle-outline', href: '/(admin)/account', match: (p) => p.startsWith('/account') },
];

/** في RTL الشريط يخرج من اليمين: الإزاحة المخفية موجبة. */
const HIDDEN_SIGN = Platform.OS === 'web' ? 1 : I18nManager.isRTL ? 1 : -1;

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(Math.round(width * 0.82), 330);
  const progress = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const animate = useCallback(
    (to: 0 | 1, done?: () => void) => {
      Animated.timing(progress, {
        toValue: to,
        duration: to ? 280 : 220,
        easing: to ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(done);
    },
    [progress],
  );

  const open = useCallback(() => {
    setVisible(true);
    animate(1);
  }, [animate]);
  const close = useCallback(() => animate(0, () => setVisible(false)), [animate]);

  const value = useMemo(() => ({ open, close }), [open, close]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [HIDDEN_SIGN * panelWidth, 0] });
  const backdrop = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <DrawerContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {visible ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#020617', opacity: backdrop }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="إغلاق القائمة" />
            </Animated.View>
            <Animated.View style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}>
              <SidebarContent onNavigate={close} />
            </Animated.View>
          </View>
        ) : null}
      </View>
    </DrawerContext.Provider>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session, logout } = useAuth();
  const profile = session.status === 'manager' ? session.profile : null;
  const name = profile?.name ?? '';

  // نستخدم replace حتى لا تتراكم الشاشات عند التنقل بين الأقسام
  const go = (href: string) => {
    onNavigate();
    router.replace(href as never);
  };

  return (
    <View style={styles.sidebar}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.sideHead, { paddingTop: insets.top + space.xl }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
          <Txt weight="heavy" size={22} color="#fff" style={{ lineHeight: 30 }}>
            {initials(name)}
          </Txt>
        </View>
        <Txt weight="heavy" size={18} color="#fff" numberOfLines={1}>
          {name}
        </Txt>
        <View style={styles.rolePill}>
          <Ionicons name="shield-checkmark" size={13} color="#bfdbfe" />
          <Txt weight="bold" size={12} color="#dbeafe" style={{ lineHeight: 18 }}>
            {profile?.role ?? 'مدير النظام'}
          </Txt>
        </View>
      </LinearGradient>

      <View style={styles.nav}>
        <Txt weight="bold" size={12} color={colors.muted} style={{ marginBottom: space.sm, marginHorizontal: space.md }}>
          الأقسام
        </Txt>
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Pressable
              key={item.href}
              onPress={() => go(item.href)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.navIcon, active && { backgroundColor: colors.primary }]}>
                <Ionicons name={item.icon} size={20} color={active ? '#fff' : colors.neutral} />
              </View>
              <Txt weight={active ? 'heavy' : 'bold'} size={15} color={active ? colors.primary : colors.text} style={{ flex: 1 }}>
                {item.label}
              </Txt>
              {active ? <View style={styles.activeBar} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.foot, { paddingBottom: insets.bottom + space.lg }]}>
        <Pressable onPress={() => void logout()} accessibilityRole="button" style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]}>
          <Ionicons name="log-out-outline" size={20} color={colors.bad} />
          <Txt weight="bold" color={colors.bad}>
            تسجيل الخروج
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  sidebar: { flex: 1 },
  sideHead: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.sm },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: space.xs,
  },
  rolePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  nav: { flex: 1, padding: space.md, paddingTop: space.lg },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md, marginBottom: 4 },
  navItemActive: { backgroundColor: colors.primarySoft },
  navIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutralSoft },
  activeBar: { width: 4, height: 22, borderRadius: 2, backgroundColor: colors.primary },
  foot: { paddingHorizontal: space.lg, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md },
  logout: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.badSoft },
});
