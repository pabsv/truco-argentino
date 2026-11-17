// Small hex colour helpers for the skins (custom stick and background colours)

export function isHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')
}

// t = 0 gives a, t = 1 gives b
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = toRgb(a)
  const [r2, g2, b2] = toRgb(b)
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map(c => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}

function fromHsl(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

// A full 100..950 table scale from any picked colour. Hue and saturation come
// from the pick; lightness follows a fixed ladder so the white text, yellow
// accents and modals stay readable even when the pick is very light.
export function scaleFrom(hex: string): Record<100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string> {
  const [h, s, l] = toHsl(hex)
  const base = Math.max(11, Math.min(30, l)) // the panel shade (800)
  const sat = Math.min(s, 75)
  return {
    100: fromHsl(h, sat, 93),
    200: fromHsl(h, sat, 85),
    300: fromHsl(h, sat, 73),
    400: fromHsl(h, sat, 60),
    500: fromHsl(h, sat, 47),
    600: fromHsl(h, sat, base + 12),
    700: fromHsl(h, sat, base + 6),
    800: fromHsl(h, sat, base),
    900: fromHsl(h, sat, base * 0.76),
    950: fromHsl(h, sat, base * 0.45),
  }
}
