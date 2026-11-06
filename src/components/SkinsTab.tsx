import { BACKGROUNDS, PRESETS, STICKS, presetFor, setSkin, useSkin } from '../lib/skins'
import { MatchBox } from './MatchBox'

// Settings tab: pick a ready made skin, or mix background and stick style by
// hand, and switch the streak celebrations on or off. Changes apply live.

export function SkinsTab() {
  const skin = useSkin()
  const activePreset = presetFor(skin)
  const tap = () => navigator.vibrate?.(8)

  return (
    <div className="flex flex-col gap-5">
      {/* Live preview: replays the draw-in whenever the style changes */}
      <div
        key={`${skin.background}-${skin.stick}`}
        className="rounded-xl border border-green-700 bg-green-800 px-3 py-3 flex items-center justify-center gap-2"
        aria-label="Vista previa"
      >
        <MatchBox points={5} active stick={skin.stick} size={50} />
        <MatchBox points={5} active stick={skin.stick} size={50} />
        <MatchBox points={2} active stick={skin.stick} size={50} />
        <span className="ml-1 text-2xl font-black text-yellow-400 tabular-nums">12</span>
      </div>

      <section>
        <SectionTitle title="Skins" note={activePreset ? activePreset.name : 'A medida'} />
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map(p => {
            const bg = BACKGROUNDS.find(b => b.id === p.background)!
            const selected = activePreset?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => { tap(); setSkin({ background: p.background, stick: p.stick }) }}
                aria-pressed={selected}
                className={`relative flex flex-col items-center gap-1 rounded-xl pt-2 pb-1.5 border-2 transition active:scale-95 ${
                  selected ? 'border-yellow-400' : 'border-white/10'
                }`}
                style={{ backgroundColor: bg.swatch }}
              >
                <MatchBox points={5} active stick={p.stick} size={38} />
                <span className="text-[11px] font-bold leading-tight text-white whitespace-nowrap">
                  {p.emoji} {p.name}
                </span>
                {selected && <Check />}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Fondo" note={BACKGROUNDS.find(b => b.id === skin.background)?.name} />
        <div className="grid grid-cols-7 gap-2 px-0.5">
          {BACKGROUNDS.map(b => {
            const selected = skin.background === b.id
            return (
              <button
                key={b.id}
                onClick={() => { tap(); setSkin({ background: b.id }) }}
                aria-label={b.name}
                aria-pressed={selected}
                className={`w-full aspect-square rounded-full transition active:scale-90 ${
                  selected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-green-900' : 'ring-1 ring-white/25'
                }`}
                style={{ backgroundColor: b.swatch }}
              />
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Palitos" />
        <div className="grid grid-cols-2 gap-2">
          {STICKS.map(s => {
            const selected = skin.stick === s.id
            return (
              <button
                key={s.id}
                onClick={() => { tap(); setSkin({ stick: s.id }) }}
                aria-pressed={selected}
                className={`relative flex items-center gap-2 rounded-xl p-2 text-left border-2 bg-green-800 transition active:scale-95 ${
                  selected ? 'border-yellow-400' : 'border-green-700'
                }`}
              >
                <MatchBox points={5} active stick={s.id} size={34} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight">{s.name}</span>
                  <span className="block text-[10px] leading-tight text-green-200">{s.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <label className="flex items-center justify-between gap-3 cursor-pointer rounded-xl bg-green-800 border border-green-700 px-3 py-2.5">
          <span>
            <span className="block font-semibold">Rachas 🔥</span>
            <span className="block text-xs text-green-200 leading-snug">
              Carteles cuando un equipo encadena 3 o más puntos, y el 67 de la racha 6... 7
            </span>
          </span>
          <Toggle checked={skin.streaks} onChange={v => { tap(); setSkin({ streaks: v }) }} label="Rachas" />
        </label>
      </section>
    </div>
  )
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400">{title}</h3>
      {note && <span className="text-xs text-green-200">{note}</span>}
    </div>
  )
}

function Check() {
  return (
    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-400 text-green-950 text-xs font-black flex items-center justify-center shadow">
      ✓
    </span>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="relative flex-shrink-0">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="block w-11 h-6 rounded-full bg-green-950 border border-green-600 transition-colors peer-checked:bg-yellow-500 peer-checked:border-yellow-400" />
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </span>
  )
}
