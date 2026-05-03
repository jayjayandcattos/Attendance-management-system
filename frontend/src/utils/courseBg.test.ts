import { describe, it, expect } from 'vitest';
import { getCourseBg, adjustColor, COURSE_GRADIENTS } from './courseBg';

/* ──────────────────────────────────────────────
   getCourseBg() tests
   ────────────────────────────────────────────── */

describe('getCourseBg', () => {
  it('returns a fallback gradient when val is falsy', () => {
    const result = getCourseBg('', 0);
    expect(result).toEqual({ background: COURSE_GRADIENTS[0] });
  });

  it('returns a different fallback gradient for different idx', () => {
    const result = getCourseBg('', 1);
    expect(result).toEqual({ background: COURSE_GRADIENTS[1] });
  });

  it('returns a gradient from a custom palette when val is falsy', () => {
    const custom = ['red', 'blue'];
    expect(getCourseBg('', 0, custom)).toEqual({ background: 'red' });
    expect(getCourseBg('', 1, custom)).toEqual({ background: 'blue' });
  });

  it('returns gradient + backgroundColor for hex color', () => {
    const result = getCourseBg('#FF0000', 0);
    expect(result).toHaveProperty('background');
    expect(result).toHaveProperty('backgroundColor', '#FF0000');
    expect(result.background).toContain('#FF0000');
  });

  it('returns backgroundImage for http URL', () => {
    const result = getCourseBg('https://example.com/bg.jpg', 0);
    expect(result).toEqual({
      backgroundImage: 'url("https://example.com/bg.jpg")',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    });
  });

  it('returns backgroundImage for /bg/ path', () => {
    const result = getCourseBg('/bg/course-banner.jpg', 0);
    expect(result).toEqual({
      backgroundImage: 'url("/bg/course-banner.jpg")',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    });
  });

  it('returns backgroundImage for data: URI', () => {
    const result = getCourseBg('data:image/png;base64,abc123', 0);
    expect(result).toEqual({
      backgroundImage: 'url("data:image/png;base64,abc123")',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    });
  });

  it('returns backgroundImage for path-like strings containing .', () => {
    const result = getCourseBg('/uploads/bg.png', 0);
    expect(result.backgroundImage).toContain('/uploads/bg.png');
  });

  it('returns raw val as background for unknown strings', () => {
    const result = getCourseBg('someColorName', 0);
    expect(result).toEqual({ background: 'someColorName' });
  });
});

/* ──────────────────────────────────────────────
   adjustColor() tests
   ────────────────────────────────────────────── */

describe('adjustColor', () => {
  it('lightens a hex color by the given amount', () => {
    // #000000 + 50 = #323232
    expect(adjustColor('#000000', 50)).toBe('#323232');
  });

  it('darkens with a negative amount', () => {
    // #FFFFFF - 50 = #CDCDCD
    expect(adjustColor('#FFFFFF', -50)).toBe('#cdcdcd');
  });

  it('clamps to 255', () => {
    expect(adjustColor('#FFFFFF', 100)).toBe('#ffffff');
  });

  it('clamps to 0', () => {
    expect(adjustColor('#000000', -100)).toBe('#000000');
  });

  it('handles hex without #', () => {
    expect(adjustColor('000000', 50)).toBe('#323232');
  });

  it('returns original value on parse failure', () => {
    expect(adjustColor('not-a-color', 50)).toBe('not-a-color');
  });
});

/* ──────────────────────────────────────────────
   COURSE_GRADIENTS is a stable array
   ────────────────────────────────────────────── */

describe('COURSE_GRADIENTS', () => {
  it('has 8 entries', () => {
    expect(COURSE_GRADIENTS).toHaveLength(8);
  });

  it('every entry is a linear-gradient string', () => {
    COURSE_GRADIENTS.forEach((g) => {
      expect(g).toMatch(/^linear-gradient\(/);
    });
  });
});
