import { useSyncExternalStore } from 'react'

// Skins: how the table looks. Three independent knobs (background, stick
// style, streak celebrations) plus a few preset combos that set the first two
// in one tap. Stored per device in localStorage; nothing is synced.
//
// Backgrounds work by overriding Tailwind's green scale (--color-green-*) on
// <html>. Every bg-green-*, border-green-* and text-green-* utility in the app
// reads those variables, so a palette re-themes the whole screen (modals
// included) without touching any className.

export type BackgroundId = 'pano' | 'madera' | 'pizarra' | 'noche' | 'bordo' | 'petroleo' | 'carbon'
export type StickId = 'linea' | 'fosforo' | 'tiza' | 'neon'

type Shade = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950
type Scale = Record<Shade, string>

export interface Background {
  id: BackgroundId
  name: string
  // null keeps Tailwind's own green (the original felt)
  scale: Scale | null
  // The panel colour (shade 800), used for swatches and the browser chrome
  swatch: string
}

export const BACKGROUNDS: Background[] = [
  { id: 'pano', name: 'Paño verde', scale: null, swatch: '#166534' },
  {
    id: 'madera',
    name: 'Madera',
    swatch: '#54351d',
    scale: { 100: '#f5e9dc', 200: '#e9d3b8', 300: '#d6b48c', 400: '#b98a5a', 500: '#9a6a3e', 600: '#7f5430', 700: '#684326', 800: '#54351d', 900: '#3f2815', 950: '#26170b' },
  },
  {
    id: 'pizarra',
    name: 'Pizarra',
    swatch: '#2b3f34',
    scale: { 100: '#e3ece6', 200: '#c5d6cb', 300: '#9fb8a8', 400: '#6f8f7b', 500: '#557563', 600: '#43604f', 700: '#364e40', 800: '#2b3f34', 900: '#213128', 950: '#131d17' },
  },
  {
    id: 'noche',
    name: 'Noche',
    swatch: '#241f5c',
    scale: { 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#5b5fc7', 600: '#4645a8', 700: '#37357f', 800: '#241f5c', 900: '#1a1442', 950: '#0d0a24' },
  },
  {
    id: 'bordo',
    name: 'Bordó',
    swatch: '#611d2b',
    scale: { 100: '#fbe4e8', 200: '#f5c2cb', 300: '#e8919f', 400: '#d26073', 500: '#b13f53', 600: '#922f42', 700: '#782636', 800: '#611d2b', 900: '#4a1521', 950: '#2b0b12' },
  },
  {
    id: 'petroleo',
    name: 'Petróleo',
    swatch: '#17514b',
    scale: { 100: '#d9f5f2', 200: '#b0e9e3', 300: '#7fd6cc', 400: '#4cb9ad', 500: '#2f9a8f', 600: '#237d74', 700: '#1d655e', 800: '#17514b', 900: '#113d39', 950: '#072321' },
  },
  {
    id: 'carbon',
    name: 'Carbón',
    swatch: '#27272a',
    scale: { 100: '#f4f4f5', 200: '#e4e4e7', 300: '#c4c4c8', 400: '#9a9aa2', 500: '#6b6b74', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#1c1c1f', 950: '#0c0c0e' },
  },
]

export interface StickStyle {
  id: StickId
  name: string
  hint: string
}

export const STICKS: StickStyle[] = [
  { id: 'linea', name: 'Líneas', hint: 'Trazo amarillo, el de siempre' },
  { id: 'fosforo', name: 'Fósforos', hint: 'Como en la mesa del bar' },
  { id: 'tiza', name: 'Tiza', hint: 'A mano, en el pizarrón' },
  { id: 'neon', name: 'Neón', hint: 'Brilla en la oscuridad' },
]

export interface SkinPreset {
  id: string
  name: string
  emoji: string
  background: BackgroundId
  stick: StickId
}

export const PRESETS: SkinPreset[] = [
  { id: 'clasico', name: 'Clásico', emoji: '🃏', background: 'pano', stick: 'linea' },
  { id: 'bar', name: 'Bar', emoji: '🔥', background: 'madera', stick: 'fosforo' },
  { id: 'pizarron', name: 'Pizarrón', emoji: '🧑‍🏫', background: 'pizarra', stick: 'tiza' },
  { id: 'boliche', name: 'Boliche', emoji: '🪩', background: 'noche', stick: 'neon' },
  { id: 'bodegon', name: 'Bodegón', emoji: '🍷', background: 'bordo', stick: 'fosforo' },
  { id: 'pecera', name: 'Pecera', emoji: '🐟', background: 'petroleo', stick: 'neon' },
]

export interface SkinSettings {
  background: BackgroundId
  stick: StickId
  // Streak badges and the 6... 7 streak chip. Off = a quiet scoreboard.
  streaks: boolean
}

const STORAGE_KEY = 'truco-skin'
const DEFAULT_SKIN: SkinSettings = { background: 'pano', stick: 'linea', streaks: true }

function read(): SkinSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SKIN
    const parsed = JSON.parse(raw) as Partial<SkinSettings>
    return {
      background: BACKGROUNDS.some(b => b.id === parsed.background) ? parsed.background! : DEFAULT_SKIN.background,
      stick: STICKS.some(s => s.id === parsed.stick) ? parsed.stick! : DEFAULT_SKIN.stick,
      streaks: typeof parsed.streaks === 'boolean' ? parsed.streaks : DEFAULT_SKIN.streaks,
    }
  } catch {
    return DEFAULT_SKIN
  }
}

// Tiny external store so the scoreboard and the settings tab share one value
// without threading props through App.
let current: SkinSettings = read()
const listeners = new Set<() => void>()

export function setSkin(patch: Partial<SkinSettings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // private mode: the skin still applies for this session
  }
  applyBackground(current.background)
  listeners.forEach(l => l())
}

export function useSkin(): SkinSettings {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}

export function presetFor(skin: SkinSettings): SkinPreset | null {
  return PRESETS.find(p => p.background === skin.background && p.stick === skin.stick) ?? null
}

const SHADES: Shade[] = [100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

export function applyBackground(id: BackgroundId) {
  const bg = BACKGROUNDS.find(b => b.id === id) ?? BACKGROUNDS[0]
  const root = document.documentElement
  for (const shade of SHADES) {
    if (bg.scale) root.style.setProperty(`--color-green-${shade}`, bg.scale[shade])
    else root.style.removeProperty(`--color-green-${shade}`)
  }
  // html paints behind the safe areas; keep it and the browser chrome in step
  root.style.backgroundColor = bg.swatch
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg.swatch)
}

// Apply the saved background before React's first paint (module load runs
// when App imports this file)
applyBackground(current.background)
