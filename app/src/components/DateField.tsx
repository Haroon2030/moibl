import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Txt } from '@/components/ui';
import { date as fmtDate, isoDate } from '@/lib/format';
import { colors, fonts, radius, space } from '@/lib/theme';

/** حقل تاريخ: منتقي أصلي على iOS/Android، وإدخال نصي YYYY-MM-DD على الويب. */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} weight="bold" color={colors.muted}>
        {label}
      </Txt>
      {Platform.OS === 'ios' ? (
        <View style={styles.box}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }} />
          <DateTimePicker value={value} mode="date" display="compact" minimumDate={minimumDate} locale="en-GB" onChange={(_, d) => d && onChange(d)} />
        </View>
      ) : Platform.OS === 'android' ? (
        <Pressable
          style={styles.box}
          accessibilityRole="button"
          onPress={() =>
            DateTimePickerAndroid.open({ value, mode: 'date', minimumDate, onChange: (_, d) => d && onChange(d) })
          }
        >
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Txt weight="bold" color={colors.ink} style={{ flex: 1 }}>
            {fmtDate(isoDate(value))}
          </Txt>
        </Pressable>
      ) : (
        <TextInput
          defaultValue={isoDate(value)}
          placeholder="YYYY-MM-DD"
          onChangeText={(t) => {
            const d = new Date(`${t.trim()}T00:00:00`);
            if (!Number.isNaN(d.getTime())) onChange(d);
          }}
          style={[styles.box, { fontFamily: fonts.regular, fontSize: 16, textAlign: 'right' }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: '#fff',
  },
});
