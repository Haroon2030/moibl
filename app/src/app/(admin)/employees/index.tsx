import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminScreen } from '@/components/admin/AdminScreen';
import { Avatar, statusTone } from '@/components/admin/people';
import { Badge, Empty, ErrorView, Loading, Txt } from '@/components/ui';
import { api, EmployeeFilters, EmployeeRow } from '@/lib/api';
import { num } from '@/lib/format';
import { colors, fonts, radius, space } from '@/lib/theme';

const PAGE = 30;

const STATUS_CHIPS: { key: string; label: string }[] = [
  { key: '', label: 'الكل' },
  { key: 'active', label: 'على رأس العمل' },
  { key: 'leave', label: 'في إجازة' },
  { key: 'suspended', label: 'موقوف' },
  { key: 'terminated', label: 'منتهي الخدمة' },
];

function PickerModal({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { id: number; name: string }[];
  value: number | null;
  onSelect: (id: number | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grab} />
        <Txt weight="heavy" size={17} color={colors.ink} style={{ marginBottom: space.sm }}>
          {title}
        </Txt>
        <ScrollView>
          {[{ id: 0, name: 'الكل' }, ...options].map((o) => {
            const selected = (o.id || null) === value;
            return (
              <Pressable
                key={o.id}
                onPress={() => {
                  onSelect(o.id || null);
                  onClose();
                }}
                style={[styles.option, selected && { backgroundColor: colors.primarySoft }]}
              >
                <Txt weight={selected ? 'heavy' : 'bold'} color={selected ? colors.primary : colors.text} style={{ flex: 1 }}>
                  {o.name}
                </Txt>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function EmployeesList() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [branch, setBranch] = useState<number | null>(null);
  const [department, setDepartment] = useState<number | null>(null);
  const [picker, setPicker] = useState<'branch' | 'department' | null>(null);
  const [filters, setFilters] = useState<EmployeeFilters | null>(null);

  const [items, setItems] = useState<EmployeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // بحث مؤجَّل لتقليل الطلبات أثناء الكتابة
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    api.adminFilters().then(setFilters).catch(() => {});
  }, []);

  const load = useCallback(
    async (mode: 'reset' | 'more' | 'refresh', offset = 0) => {
      const id = ++reqId.current;
      if (mode === 'more') setMore(true);
      else if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const page = await api.adminEmployees({ q, status, branch, department, offset, limit: PAGE });
        if (id !== reqId.current) return;
        setItems((prev) => (mode === 'more' ? [...prev, ...page.results] : page.results));
        setTotal(page.total);
        setError(null);
      } catch (e: any) {
        if (id === reqId.current) setError(e?.message ?? 'حدث خطأ غير متوقع.');
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setMore(false);
          setRefreshing(false);
        }
      }
    },
    [q, status, branch, department],
  );

  useEffect(() => {
    void load('reset');
  }, [load]);

  const branchName = filters?.branches.find((b) => b.id === branch)?.name;
  const deptName = filters?.departments.find((d) => d.id === department)?.name;
  const anyFilter = !!(status || branch || department);

  const header = (
    <View style={{ gap: space.md }}>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color="rgba(255,255,255,0.8)" />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="بحث بالاسم أو الرقم الوظيفي أو الهوية أو الجوال"
          placeholderTextColor="rgba(255,255,255,0.6)"
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {input ? (
          <Pressable onPress={() => setInput('')} hitSlop={8} accessibilityLabel="مسح البحث">
            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Pressable onPress={() => setPicker('branch')} style={[styles.chip, branch ? styles.chipOn : null]}>
          <Ionicons name="storefront-outline" size={14} color={branch ? colors.primary : '#e2e8f0'} />
          <Txt weight="bold" size={12} color={branch ? colors.primary : '#e2e8f0'} numberOfLines={1} style={{ lineHeight: 18, maxWidth: 130 }}>
            {branchName ?? 'الفرع'}
          </Txt>
        </Pressable>
        <Pressable onPress={() => setPicker('department')} style={[styles.chip, department ? styles.chipOn : null]}>
          <Ionicons name="git-network-outline" size={14} color={department ? colors.primary : '#e2e8f0'} />
          <Txt weight="bold" size={12} color={department ? colors.primary : '#e2e8f0'} numberOfLines={1} style={{ lineHeight: 18, maxWidth: 130 }}>
            {deptName ?? 'القسم'}
          </Txt>
        </Pressable>
        {STATUS_CHIPS.map((c) => (
          <Pressable key={c.key} onPress={() => setStatus(c.key)} style={[styles.chip, status === c.key ? styles.chipOn : null]}>
            <Txt weight="bold" size={12} color={status === c.key ? colors.primary : '#e2e8f0'} style={{ lineHeight: 18 }}>
              {c.label}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <AdminScreen title="بيانات الموظفين" subtitle={loading && !items.length ? 'جارٍ التحميل…' : `${num(total)} موظف`} header={header}>
      {loading && !items.length ? (
        <Loading />
      ) : error && !items.length ? (
        <ErrorView message={error} onRetry={() => load('reset')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 2, gap: space.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!more && !loading && items.length < total) void load('more', items.length);
          }}
          ListEmptyComponent={
            <Empty icon="search-outline" text={q || anyFilter ? 'لا توجد نتائج مطابقة.' : 'لا يوجد موظفون.'} />
          }
          ListFooterComponent={more ? <ActivityIndicator color={colors.primary} style={{ margin: space.lg }} /> : null}
          renderItem={({ item: e }) => (
            <Pressable onPress={() => router.push(`/(admin)/employees/${e.id}`)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
              <Avatar name={e.name} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight="heavy" size={15} color={colors.ink} numberOfLines={1}>
                  {e.name}
                </Txt>
                <Txt weight="bold" size={12} color={colors.muted} numberOfLines={1}>
                  {[e.profession, e.branch].filter(Boolean).join(' · ') || '—'}
                </Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 }}>
                  <Badge label={e.status_display} tone={statusTone(e.status)} />
                  {e.employee_number ? (
                    <Txt weight="bold" size={12} color={colors.muted}>
                      #{e.employee_number}
                    </Txt>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-back" size={20} color="#94a3b8" />
            </Pressable>
          )}
        />
      )}

      <PickerModal
        visible={picker === 'branch'}
        title="اختر الفرع"
        options={filters?.branches ?? []}
        value={branch}
        onSelect={setBranch}
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'department'}
        title="اختر القسم"
        options={filters?.departments ?? []}
        value={department}
        onSelect={setDepartment}
        onClose={() => setPicker(null)}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 48,
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: fonts.regular, fontSize: 14, textAlign: 'right', minHeight: 44 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  chipOn: { backgroundColor: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.55)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    maxHeight: '70%',
    backgroundColor: colors.card,
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    padding: space.lg,
  },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1', marginBottom: space.md },
  option: { flexDirection: 'row', alignItems: 'center', padding: space.md, borderRadius: radius.md },
});
