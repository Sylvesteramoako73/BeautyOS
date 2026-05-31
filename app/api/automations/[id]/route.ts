import { NextResponse } from 'next/server'
import { updateAutomation, deleteAutomation } from '@/lib/actions/automations'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body    = await request.json()
  const updated = await updateAutomation(params.id, body)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await deleteAutomation(params.id)
  return NextResponse.json({ ok: true })
}
