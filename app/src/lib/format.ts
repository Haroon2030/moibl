import { Tone } from './theme';

/** مبلغ بأرقام لاتينية وفاصل آلاف: 12,345.50 ر.س */
export function money(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

/** رقم عادي (أيام، عدد) بلا كسور زائدة */
export function num(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** 2026-10-09 → 2026/10/09 */
export function date(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 10).replace(/-/g, '/');
}

/** حالة الطلب في مسار الموافقات → نغمة لونية */
export function statusTone(status: string): Tone {
  if (status === 'approved') return 'good';
  if (status === 'returned' || status === 'rejected') return 'bad';
  if (status.startsWith('pending')) return 'warn';
  return 'neutral';
}

/** حالة السلفة/القسط */
export function loanTone(status: string): Tone {
  if (status === 'paid') return 'good';
  if (status === 'cancelled') return 'bad';
  if (status === 'pending' || status === 'skipped') return 'warn';
  return 'info';
}

/** يحوّل الأرقام العربية/الفارسية (٠-٩ ۰-۹) إلى لاتينية، ويوحّد الفاصلة العشرية. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.');
}

/** Date → 2026-10-09 (بالتوقيت المحلي) */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
