import type { ReactNode } from 'react'

interface PageShellProps {
  title: string
  right?: ReactNode
  back?: ReactNode
  children: ReactNode
}

/**
 * Scrollable page frame. Fills the AppShell's flex-1 main. Header is fixed,
 * body scrolls internally (opting back into scroll under the globally
 * `overflow:hidden` root in index.css).
 */
export function PageShell({ title, right, back, children }: PageShellProps) {
  return (
    <div className="h-full flex flex-col bg-green-800 text-white min-h-0">
      <header
        className="bg-green-900 px-3 border-b border-green-700 flex-shrink-0 flex items-center justify-between gap-2"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {back}
          <h1 className="text-lg font-bold tracking-wide py-2 truncate">{title}</h1>
        </div>
        {right}
      </header>
      <main
        className="flex-1 overflow-y-auto overscroll-contain min-h-0"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className="p-3">{children}</div>
      </main>
    </div>
  )
}
