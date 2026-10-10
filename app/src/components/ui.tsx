import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, radius, shadow, space, Tone, toneColors } from '@/lib/theme';

// ── نص بخط Cairo ────────────────────────────────────────────────────────────
type Weight = 'regular' | 'bold' | 'heavy';

export function Txt({
  weight = 'regular',
  size = 14,
  color = colors.text,
  style,
  ...rest
}: TextProps & { weight?: Weight; size?: number; color?: string }) {
  return <Text {...rest} style={[{ fontFamily: fonts[weight], fontSize: size, color, lineHeight: size * 1.6 }, style]} />;
}

// ── بطاقة وحقول ─────────────────────────────────────────────────────────────
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

export function Field({ label, value, tone }: { label: string; value: string | null | undefined; tone?: Tone }) {
  return (
    <View style={styles.field}>
      <Txt size={12} weight="bold" color={colors.muted}>
        {label}
      </Txt>
      <Txt weight="bold" color={tone ? toneColors[tone].fg : colors.ink} style={styles.fieldValue}>
        {value || '—'}
      </Txt>
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Txt size={12} weight="heavy" color={t.fg} style={{ lineHeight: 18 }}>
        {label}
      </Txt>
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Txt weight="heavy" size={16} color={colors.ink} style={{ marginTop: space.lg, marginBottom: space.sm }}>
      {children}
    </Txt>
  );
}

// ── أزرار ───────────────────────────────────────────────────────────────────
export function Button({
  title,
  onPress,
  tone = 'primary',
  loading,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  tone?: 'primary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const bg = tone === 'primary' ? colors.primary : tone === 'danger' ? colors.bad : 'transparent';
  const fg = tone === 'ghost' ? colors.primary : '#fff';
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: off ? 0.5 : 1, transform: [{ scale: pressed && !off ? 0.98 : 1 }] },
        tone === 'primary' && !off && { shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
        tone === 'ghost' && { borderWidth: 1, borderColor: colors.line },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Txt weight="bold" color={fg} size={15}>
            {title}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} weight="bold" color={focused ? colors.primary : colors.muted}>
        {label}
      </Txt>
      <TextInput
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor="#94a3b8"
        style={[
          styles.input,
          { fontFamily: fonts.regular },
          focused && { borderColor: colors.primary, backgroundColor: '#fff', shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
          props.multiline && { minHeight: 90, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

// ── حالات الشاشة ────────────────────────────────────────────────────────────
export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.muted} />
      <Txt weight="bold" style={{ textAlign: 'center', marginVertical: space.md }}>
        {message}
      </Txt>
      <Button title="إعادة المحاولة" onPress={onRetry} tone="ghost" icon="refresh" />
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', text }: { icon?: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={44} color="#cbd5e1" />
      <Txt weight="bold" color={colors.muted} style={{ marginTop: space.sm, textAlign: 'center' }}>
        {text}
      </Txt>
    </View>
  );
}

// ── قوائم وشاشات ────────────────────────────────────────────────────────────
interface ApiState {
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** قائمة مع تحميل/خطأ/فراغ وسحب للتحديث. */
export function ListScreen<T>({
  state,
  items,
  renderItem,
  emptyText,
  header,
}: {
  state: ApiState;
  items: T[];
  renderItem: (item: T) => React.ReactElement;
  emptyText: string;
  header?: React.ReactElement | null;
}) {
  if (state.loading && !items.length) return <Loading />;
  if (state.error && !items.length) return <ErrorView message={state.error} onRetry={state.reload} />;
  return (
    <FlatList
      data={items}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={header}
      ListEmptyComponent={<Empty text={emptyText} />}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.primary} />}
    />
  );
}

/** شاشة تفاصيل قابلة للتمرير مع سحب للتحديث. */
export function DetailScreen({ state, children }: { state: ApiState & { data: unknown }; children: React.ReactNode }) {
  if (state.loading && !state.data) return <Loading />;
  if (state.error && !state.data) return <ErrorView message={state.error} onRetry={state.reload} />;
  return (
    <ScrollView
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={colors.primary} />}
    >
      {children}
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
    ...shadow,
  },
  field: { gap: 2 },
  fieldValue: { fontSize: 15 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: '#d5dcec',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#f9fafe',
    textAlign: 'right',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, minHeight: 240 },
  listContent: { padding: space.lg, paddingBottom: space.xl * 2, flexGrow: 1 },
});
