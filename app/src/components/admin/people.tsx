import React from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui';
import { avatarColor, Tone } from '@/lib/theme';

export const statusTone = (s: string): Tone => (s === 'active' ? 'good' : s === 'leave' ? 'info' : s === 'suspended' ? 'warn' : 'bad');

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? '') + (p[1]?.[0] ?? '');
}

export function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
      <Txt weight="heavy" size={size * 0.38} color="#fff" style={{ lineHeight: size * 0.6 }}>
        {initials(name)}
      </Txt>
    </View>
  );
}
