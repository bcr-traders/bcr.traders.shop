import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guard'

type Params = { params: Promise<{ id: string }> }

// PATCH — mark an unserviceable attempt contacted / save a follow-up note.
export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin(); if (denied) return denied
  const { id } = await params
  const body = await request.json()

  const allowed = ['is_contacted', 'notes']
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) update[k] = body[k]
  if (!Object.keys(update).length) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('unserviceable_attempts').update(update).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
