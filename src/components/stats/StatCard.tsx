import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: boolean
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div
      className={`rounded-xl p-3 border flex flex-col gap-0.5 ${
        accent ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-green-900 border-green-700'
      }`}
    >
      <span className="text-[11px] uppercase tracking-wide text-green-300">{label}</span>
      <span className={`text-xl font-bold ${accent ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </span>
      {sub != null && <span className="text-xs text-green-300">{sub}</span>}
    </div>
  )
}
