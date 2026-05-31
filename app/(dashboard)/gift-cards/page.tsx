import { requireRole } from '@/lib/auth'
import { getGiftCards } from '@/lib/actions/gift-cards'
import { GiftCardsView } from './view'

export default async function GiftCardsPage() {
  await requireRole('owner', 'manager')
  const cards = await getGiftCards()
  return <GiftCardsView cards={cards} />
}

export const revalidate = 30
