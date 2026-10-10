import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, TextField, Txt } from '@/components/ui';
import { getBaseUrl, setBaseUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fonts, gradients, radius, space } from '@/lib/theme';

type Mode = 'employee' | 'manager';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** حقل بأيقونة بادئة وحلقة تركيز */
function IconField({
  label,
  icon,
  right,
  inputRef,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; icon: IconName; right?: React.ReactNode; inputRef?: React.Ref<TextInput> }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} weight="bold" color={focused ? colors.primary : colors.muted}>
        {label}
      </Txt>
      <View style={[styles.field, focused && styles.fieldFocus]}>
        <Ionicons name={icon} size={20} color={focused ? colors.primary : '#94a3b8'} />
        <TextInput
          {...props}
          ref={inputRef}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor="#94a3b8"
          style={[styles.fieldInput, { fontFamily: fonts.regular }]}
        />
        {right}
      </View>
    </View>
  );
}

export default function Login() {
  const { loginEmployee, loginManager } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('employee');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showServer, setShowServer] = useState(false);
  const [server, setServer] = useState(getBaseUrl());
  const secondRef = useRef<TextInput>(null);

  const canSubmit = mode === 'employee' ? !!employeeNumber.trim() && !!idNumber.trim() : !!username.trim() && !!password;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      setBaseUrl(server);
      if (mode === 'employee') await loginEmployee(employeeNumber, idNumber);
      else await loginManager(username, password);
    } catch (e: any) {
      setError(e?.message || 'تعذّر تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }

  const eye = (
    <Pressable onPress={() => setReveal((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={reveal ? 'إخفاء' : 'إظهار'}>
      <Ionicons name={reveal ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.navy }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + space.xl * 1.5 }]}>
          <View style={styles.ringA} />
          <View style={styles.ringB} />
          <View style={styles.logo}>
            <Ionicons name="people" size={32} color="#fff" />
          </View>
          <Txt weight="heavy" size={28} color="#fff">
            خدمة الموظف
          </Txt>
          <Txt color="#c7d2fe" weight="bold" size={14}>
            رصيدك وطلباتك ومستحقاتك في مكان واحد
          </Txt>
        </LinearGradient>

        <View style={[styles.panel, { paddingBottom: insets.bottom + space.xl }]}>
          <View style={styles.segment} accessibilityRole="tablist">
            {(['employee', 'manager'] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setError(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                >
                  <Ionicons name={m === 'employee' ? 'person-outline' : 'briefcase-outline'} size={17} color={active ? colors.primary : colors.muted} />
                  <Txt weight="bold" color={active ? colors.primary : colors.muted}>
                    {m === 'employee' ? 'موظف' : 'مدير'}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          {mode === 'employee' ? (
            <View style={{ gap: space.lg }}>
              <IconField
                label="الرقم الوظيفي"
                icon="id-card-outline"
                value={employeeNumber}
                onChangeText={setEmployeeNumber}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => secondRef.current?.focus()}
              />
              <IconField
                label="رقم الهوية"
                icon="lock-closed-outline"
                inputRef={secondRef}
                value={idNumber}
                onChangeText={setIdNumber}
                keyboardType="number-pad"
                secureTextEntry={!reveal}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={submit}
                right={eye}
              />
            </View>
          ) : (
            <View style={{ gap: space.lg }}>
              <IconField
                label="اسم المستخدم أو رقمه"
                icon="person-circle-outline"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => secondRef.current?.focus()}
              />
              <IconField
                label="كلمة المرور"
                icon="lock-closed-outline"
                inputRef={secondRef}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!reveal}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={submit}
                right={eye}
              />
            </View>
          )}

          {error ? (
            <View style={styles.error} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={20} color={colors.bad} />
              <Txt weight="bold" color={colors.bad} size={13} style={{ flex: 1 }}>
                {error}
              </Txt>
            </View>
          ) : null}

          <Button title="تسجيل الدخول" icon="log-in-outline" onPress={submit} loading={busy} disabled={!canSubmit} />

          <Pressable onPress={() => setShowServer((v) => !v)} style={{ alignSelf: 'center', padding: space.sm }} accessibilityRole="button">
            <Txt size={12} color={colors.muted} weight="bold">
              إعدادات الاتصال بالخادم
            </Txt>
          </Pressable>
          {showServer ? (
            <Card>
              <TextField label="عنوان الخادم" value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              <Txt size={12} color={colors.muted}>
                على الجوال الحقيقي استخدم عنوان الحاسوب في الشبكة المحلية، مثل http://192.168.1.10:8010
              </Txt>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.xl, paddingBottom: space.xl * 2.2, gap: 6, overflow: 'hidden' },
  ringA: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 36, borderColor: 'rgba(255,255,255,0.06)', top: -90, end: -80 },
  ringB: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 24, borderColor: 'rgba(255,255,255,0.05)', bottom: -50, start: -40 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  panel: {
    flex: 1,
    marginTop: -space.xl,
    backgroundColor: colors.canvas,
    borderTopStartRadius: 32,
    borderTopEndRadius: 32,
    padding: space.xl,
    gap: space.lg,
  },
  segment: { flexDirection: 'row', backgroundColor: '#e6eaf5', borderRadius: radius.md, padding: 4 },
  segmentItem: { flex: 1, minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: '#fff', shadowColor: '#0b1736', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#d5dcec',
    backgroundColor: '#fff',
  },
  fieldFocus: { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  fieldInput: { flex: 1, fontSize: 16, color: colors.ink, textAlign: 'right', minHeight: 50 },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.badSoft, borderRadius: radius.md, padding: space.md },
});
