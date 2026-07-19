import { supabase } from './supabase'
import type { Player } from './types'

interface PlayerRow {
  id: string
  name: string
  group_id: string | null
  created_at: string
  archived_at: string | null
}

function mapPlayer(r: PlayerRow): Player {
  return {
    id: r.id,
    name: r.name,
    groupId: r.group_id,
    createdAt: r.created_at,
    archivedAt: r.archived_at,
  }
}

export async function listPlayers(opts: { includeArchived?: boolean } = {}): Promise<Player[]> {
  let query = supabase
    .from('players')
    .select('id, name, group_id, created_at, archived_at')
    .order('name', { ascending: true })

  if (!opts.includeArchived) query = query.is('archived_at', null)

  const { data, error } = await query
  if (error) throw error
  return (data as PlayerRow[]).map(mapPlayer)
}

/** Human-friendly error for the case-insensitive-unique-name violation. */
class DuplicatePlayerError extends Error {
  constructor(name: string) {
    super(`Ya existe un jugador llamado "${name}".`)
    this.name = 'DuplicatePlayerError'
  }
}

export async function addPlayer(name: string): Promise<Player> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('El nombre no puede estar vacío.')

  const { data, error } = await supabase
    .from('players')
    .insert({ name: trimmed })
    .select('id, name, group_id, created_at, archived_at')
    .single()

  if (error) {
    if (error.code === '23505') throw new DuplicatePlayerError(trimmed)
    throw error
  }
  return mapPlayer(data as PlayerRow)
}

export async function renamePlayer(id: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('El nombre no puede estar vacío.')
  const { error } = await supabase.from('players').update({ name: trimmed }).eq('id', id)
  if (error) {
    if (error.code === '23505') throw new DuplicatePlayerError(trimmed)
    throw error
  }
}

export async function archivePlayer(id: string): Promise<void> {
  const { error } = await supabase
    .from('players')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function restorePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').update({ archived_at: null }).eq('id', id)
  if (error) throw error
}
