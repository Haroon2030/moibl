import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { colors, radius, space } from '@/lib/theme';

/** شريط تنبيه ملوّن داخل نماذج الطلبات. */
export function Banner({ tone, text }: { tone: 'bad' | 'warn' | 'info'; text: string }) {
  const bg = tone === 'bad' ? colors.badSoft : tone === 'warn' ? colors.warnSoft : colors.infoSoft;
  const fg = tone === 'bad' ? colors.bad : tone === 'warn' ? colors.warn : colors.info;
  const icon = tone === 'bad' ? 'alert-circle' : tone === 'warn' ? 'warning' : 'information-circle';
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={fg} />
      <Txt weight="bold" size={13} color={fg} style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md },
});
