import { describe, expect, it } from 'vitest';
import { pastelOf, toPastelPalette } from './colors';

/** '#rrggbb' → HSL lightness 0-1, for asserting "is this actually pale?". */
function lightnessOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

/** WCAG relative luminance, used for the contrast ratio below. */
function luminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const SAMPLES = ['#3b82f6', '#f59e0b', '#ef4444', '#22c55e', '#a855f7', '#0ea5e9'];

describe('toPastelPalette', () => {
  it('returns pale backgrounds for saturated inputs', () => {
    for (const hex of SAMPLES) {
      const { background } = toPastelPalette(hex);
      expect(lightnessOf(background), `${hex} did not become pale`).toBeGreaterThan(0.8);
    }
  });

  it('keeps label text readable on its own background', () => {
    for (const hex of SAMPLES) {
      const { background, text } = toPastelPalette(hex);
      // 4.5:1 is the WCAG AA threshold for normal text.
      expect(contrastRatio(background, text), `${hex} had poor contrast`).toBeGreaterThan(4.5);
    }
  });

  it('keeps distinct hues distinct', () => {
    const backgrounds = SAMPLES.map((hex) => toPastelPalette(hex).background);
    expect(new Set(backgrounds).size).toBe(SAMPLES.length);
  });

  it('gives the border more depth than the background', () => {
    for (const hex of SAMPLES) {
      const { background, border } = toPastelPalette(hex);
      expect(lightnessOf(border), `${hex} border not darker`).toBeLessThan(lightnessOf(background));
    }
  });

  it('accepts shorthand hex', () => {
    expect(toPastelPalette('#f00')).toEqual(toPastelPalette('#ff0000'));
  });

  it('tints greys neutrally rather than inventing a colour', () => {
    const { background } = toPastelPalette('#808080');
    const r = parseInt(background.slice(1, 3), 16);
    const g = parseInt(background.slice(3, 5), 16);
    const b = parseInt(background.slice(5, 7), 16);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(20);
  });

  it('falls back to neutral grey for unusable values', () => {
    const fallback = toPastelPalette('#3b82f6');
    for (const bad of ['', 'not-a-colour', '#12345', undefined, null]) {
      const palette = toPastelPalette(bad as string | undefined | null);
      expect(palette.background).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette).not.toEqual(fallback);
    }
  });

  it('always emits well-formed hex', () => {
    for (const hex of [...SAMPLES, '#000000', '#ffffff', '#808080']) {
      const palette = toPastelPalette(hex);
      for (const value of [palette.background, palette.text, palette.border]) {
        expect(value).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe('pastelOf', () => {
  it('matches toPastelPalette and is stable across calls', () => {
    expect(pastelOf('#3b82f6')).toEqual(toPastelPalette('#3b82f6'));
    expect(pastelOf('#3b82f6')).toEqual(pastelOf('#3b82f6'));
  });

  it('handles a missing colour without throwing', () => {
    expect(() => pastelOf(undefined)).not.toThrow();
    expect(pastelOf(undefined).background).toMatch(/^#[0-9a-f]{6}$/);
  });
});
