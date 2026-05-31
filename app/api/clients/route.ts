import { NextResponse } from 'next/server'
import { getClients, createClient } from '@/lib/actions/clients'

export async function GET() {
  const clients = await getClients()
  return NextResponse.json({ clients, total: clients.length })
}

export async function POST(request: Request) {
  const body = await request.json()
  const client = await createClient(body)
  return NextResponse.json(client, { status: 201 })
}
