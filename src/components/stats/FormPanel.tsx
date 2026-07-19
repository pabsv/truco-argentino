import type { FormStats, Outcome } from '../../lib/stats'

function Pill({ o }: { o: Outcome }) {
  const map: Record<Outcome, string> = {
    W: 'bg-green-500 text-green-950',
    L: 'bg-red-500 text-red-950',
    T: 'bg-green-700 text-green-100',
  }
  const label: Record<Outcome, string> = { W: 'G', L: 'P', T: 'E' }
  return (
    <span
      className={`inline-flex w-5 h-5 items-center justify-center rounded text-xs font-bold ${map[o]}`}
    >
      {label[o]}
    </span>
  )
}

export function FormPanel({ form }: { form: FormStats }) {
  const streakLabel =
    form.currentStreak.type === 'none'
      ? '—'
      : `${form.currentStreak.length} ${
          form.currentStreak.type === 'W'
            ? 'victorias'
            : form.currentStreak.type === 'L'
              ? 'derrotas'
              : 'empates'
        }`

  return (
    <div className="rounded-xl bg-green-900 border border-green-700 p-3 flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[11px] uppercase text-green-300">Racha actual</div>
          <div
            className={`text-lg font-bold ${
              form.currentStreak.type === 'W'
                ? 'text-yellow-400'
                : form.currentStreak.type === 'L'
                  ? 'text-red-300'
                  : 'text-white'
            }`}
          >
            {streakLabel}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-green-300">Mejor racha</div>
          <div className="text-lg font-bold text-green-200">{form.longestWinStreak} 🏆</div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-green-300">Peor racha</div>
          <div className="text-lg font-bold text-red-200">{form.longestLossStreak}</div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-300 w-16">Últimas 5</span>
          <div className="flex gap-1">
            {form.last5.length ? (
              form.last5.map((o, i) => <Pill key={i} o={o} />)
            ) : (
              <span className="text-xs text-green-500">—</span>
            )}
          </div>
          <span className="text-xs text-green-300 ml-auto">
            {Math.round(form.last5WinPct * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-300 w-16">Últimas 10</span>
          <div className="flex gap-1 flex-wrap">
            {form.last10.length ? (
              form.last10.map((o, i) => <Pill key={i} o={o} />)
            ) : (
              <span className="text-xs text-green-500">—</span>
            )}
          </div>
          <span className="text-xs text-green-300 ml-auto">
            {Math.round(form.last10WinPct * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
