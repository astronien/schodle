// Turns a shift type's configured colour into a soft pastel pairing for the
// schedule grid.
//
// Shift colours are picked by the manager and stored per shift type, so the
// grid used to render whatever was chosen at full saturation with white text.
// A month grid is a wall of those chips, which is tiring to read. Rather than
// overwrite the manager's choices, we derive a display pairing: the hue is
// kept (so shifts stay tellable apart, and future colours work automatically)
// while saturation and lightness are pulled into a calm pastel range, with a
// deep version of the same hue for the label so contrast stays comfortable.

export interface PastelPalette {
  /** Soft background fill. */
  background: string;
  /** Deep, same-hue text colour that reads clearly on `background`. */
  text: string;
  /** Slightly deeper than the background, to give the chip a defined edge. */
  border: string;
}

const FALLBACK: PastelPalette = {
  background: '#e8e8ea',
  text: '#4a4a55',
  border: '#d2d2d8',
};

/** '#rgb' | '#rrggbb' → {r,g,b} 0-255, or null when unparsable. */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h, s, l };
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number): string {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = l;
    g = l;
    b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  const toHex = (n: number) =>
    Math.round(Math.min(1, Math.max(0, n)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** WCAG relative luminance of an '#rrggbb' colour. */
function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA for normal text. */
const MIN_CONTRAST = 4.5;

/**
 * Darken a hue until it clears the contrast threshold against `background`.
 *
 * A fixed lightness is not enough: perceptually bright hues (amber, lime)
 * reflect far more light than blues at the same HSL lightness, so amber text
 * that looks fine by the numbers can still fail AA. Stepping down until the
 * measured ratio passes keeps every shift colour legible.
 */
function readableTextFor(h: number, s: number, background: string): string {
  for (let l = 0.32; l >= 0.12; l -= 0.02) {
    const candidate = hslToHex(h, s, l);
    if (contrastRatio(background, candidate) >= MIN_CONTRAST) return candidate;
  }
  return hslToHex(h, s, 0.12);
}

/**
 * Derive the pastel pairing for a stored shift colour.
 * Unparsable or missing values fall back to a neutral grey rather than
 * throwing — a bad colour in the database must not break the grid.
 */
export function toPastelPalette(hex: string | undefined | null): PastelPalette {
  if (!hex) return FALLBACK;
  const rgb = parseHex(hex);
  if (!rgb) return FALLBACK;

  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // A near-grey source has no hue worth keeping; tint it very lightly so it
  // still reads as neutral instead of being forced into a random colour.
  const isNeutral = s < 0.08;
  const bgSat = isNeutral ? 0.06 : clamp(s, 0.35, 0.62);
  const textSat = isNeutral ? 0.08 : clamp(s, 0.45, 0.8);

  const background = hslToHex(h, bgSat, 0.88);
  return {
    background,
    border: hslToHex(h, bgSat, 0.76),
    text: readableTextFor(h, textSat, background),
  };
}

// A month grid renders one chip per employee per day, all drawn from a handful
// of shift colours — convert each distinct colour once instead of per cell.
const paletteCache = new Map<string, PastelPalette>();
const PALETTE_CACHE_LIMIT = 200;

/** Memoised {@link toPastelPalette}. */
export function pastelOf(hex: string | undefined | null): PastelPalette {
  const key = hex ?? '';
  const cached = paletteCache.get(key);
  if (cached) return cached;

  const palette = toPastelPalette(hex);
  // Colours are edited in settings, so the set of keys is tiny and stable;
  // the cap is only here so a pathological caller can't grow this forever.
  if (paletteCache.size >= PALETTE_CACHE_LIMIT) paletteCache.clear();
  paletteCache.set(key, palette);
  return palette;
}
