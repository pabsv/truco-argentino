import { useMemo } from 'react'
import { PageShell } from '../components/layout/PageShell'
import { AddPlayerInput } from '../components/roster/AddPlayerInput'
import { PlayerListItem } from '../components/roster/PlayerListItem'
import { useStatsData } from '../hooks/useStatsData'
import { addPlayer, renamePlayer, archivePlayer, restorePlayer } from '../lib/players'

export function RosterPage() {
  const { games, players, loading, error, refetch } = useStatsData()

  const gameCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of games)
      for (const t of g.teams)
        for (const pid of t.playerIds) m.set(pid, (m.get(pid) ?? 0) + 1)
    return m
  }, [games])

  const active = players.filter((p) => !p.archivedAt)
  const archived = players.filter((p) => p.archivedAt)

  return (
    <PageShell title="Jugadores">
      <div className="flex flex-col gap-4">
        <AddPlayerInput
          onAdd={async (name) => {
            await addPlayer(name)
            await refetch()
          }}
        />

        {error && <p className="text-sm text-red-300">{error}</p>}
        {loading && <p className="text-sm text-green-300">Cargando…</p>}

        <div className="flex flex-col gap-2">
          {active.map((p) => (
            <PlayerListItem
              key={p.id}
              player={p}
              games={gameCounts.get(p.id) ?? 0}
              onRename={async (id, name) => {
                await renamePlayer(id, name)
                await refetch()
              }}
              onArchive={async (id) => {
                await archivePlayer(id)
                await refetch()
              }}
              onRestore={async (id) => {
                await restorePlayer(id)
                await refetch()
              }}
            />
          ))}
          {!loading && active.length === 0 && (
            <p className="text-sm text-green-300">
              Agregá jugadores para empezar a registrar partidas.
            </p>
          )}
        </div>

        {archived.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wide text-green-400">Archivados</span>
            {archived.map((p) => (
              <PlayerListItem
                key={p.id}
                player={p}
                games={gameCounts.get(p.id) ?? 0}
                onRename={async (id, name) => {
                  await renamePlayer(id, name)
                  await refetch()
                }}
                onArchive={async (id) => {
                  await archivePlayer(id)
                  await refetch()
                }}
                onRestore={async (id) => {
                  await restorePlayer(id)
                  await refetch()
                }}
              />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
