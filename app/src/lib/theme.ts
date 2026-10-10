/** هوية التطبيق — مأخوذة من نظام الموارد البشرية (أزرق + ألوان حالات هادئة). */
export const colors = {
  navy: '#0b1736',
  primary: '#3558e8',
  primarySoft: '#eef2ff',
  ink: '#0b1736',
  text: '#1e293b',
  muted: '#64748b',
  line: '#e3e8f2',
  canvas: '#f4f6fb',
  card: '#ffffff',
  good: '#0b7f72',
  goodSoft: '#d6f5ef',
  warn: '#b45309',
  warnSoft: '#fef3c7',
  bad: '#b91c1c',
  badSoft: '#fee2e2',
  info: '#2f4fd0',
  infoSoft: '#e3e9ff',
  neutral: '#475569',
  neutralSoft: '#f1f5f9',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const fonts = {
  regular: 'Cairo_500Medium',
  bold: 'Cairo_700Bold',
  heavy: 'Cairo_800ExtraBold',
};

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  good: { fg: colors.good, bg: colors.goodSoft },
  warn: { fg: colors.warn, bg: colors.warnSoft },
  bad: { fg: colors.bad, bg: colors.badSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  neutral: { fg: colors.neutral, bg: colors.neutralSoft },
};

/** تدرجات لوحة الأدمن */
export const gradients = {
  hero: ['#0b1736', '#1b2f7a', '#3558e8'] as const,
  violet: ['#312e81', '#6d28d9', '#a855f7'] as const,
  emerald: ['#064e3b', '#047857', '#10b981'] as const,
  amber: ['#78350f', '#b45309', '#f59e0b'] as const,
  rose: ['#881337', '#be123c', '#fb7185'] as const,
  sky: ['#0c4a6e', '#0369a1', '#38bdf8'] as const,
};

/** لون ثابت لكل اسم (للأفاتار) */
const AVATARS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#e11d48', '#0891b2', '#4f46e5', '#c026d3'];
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

/** ظل ناعم موحّد للأسطح المرفوعة (iOS ظل، Android elevation) */
export const shadow = {
  shadowColor: '#0b1736',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2,
} as const;
