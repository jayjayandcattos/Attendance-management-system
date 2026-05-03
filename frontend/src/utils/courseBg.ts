import type { CSSProperties } from 'react';

export const COURSE_GRADIENTS = [
  'linear-gradient(135deg, #FF6B4A 0%, #FF4757 100%)',
  'linear-gradient(135deg, #F4A742 0%, #E8950A 100%)',
  'linear-gradient(135deg, #7B68EE 0%, #6C5CE7 100%)',
  'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
  'linear-gradient(135deg, #34A853 0%, #059669 100%)',
  'linear-gradient(135deg, #00BCD4 0%, #0891B2 100%)',
  'linear-gradient(135deg, #9C27B0 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #FF5722 0%, #DC2626 100%)',
];

export function getCourseBg(
  val: string,
  idx: number,
  gradients: string[] = COURSE_GRADIENTS
): CSSProperties {
  if (!val) return { background: gradients[idx % gradients.length] };
  if (val.startsWith('#')) return {
    background: `linear-gradient(135deg, ${val}, ${adjustColor(val, 30)})`,
    backgroundColor: val,
  };
  if (val.startsWith('http') || val.startsWith('/bg/') || val.startsWith('data:')) return {
    backgroundImage: `url("${val}")`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };
  if (val.includes('.') || val.includes('/') || val.includes(':')) return {
    backgroundImage: `url("${val}")`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };
  return { background: val };
}

export function adjustColor(hex: string, amount: number): string {
  try {
    const h = hex.replace('#', '');
    const num = parseInt(h, 16);
    if (isNaN(num)) return hex;
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp(((num >> 16) & 0xff) + amount);
    const g = clamp(((num >> 8) & 0xff) + amount);
    const b = clamp((num & 0xff) + amount);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}
