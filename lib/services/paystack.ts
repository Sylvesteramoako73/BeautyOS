export type PaystackConfig = {
  enabled: boolean
  publicKey: string | null
}

export function getPaystackConfig(): PaystackConfig {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? null
  return { enabled: !!publicKey, publicKey }
}

export type InitializePaymentResult = {
  success: boolean
  authorizationUrl?: string
  reference?: string
  mock?: boolean
  error?: string
}

export async function initializePayment(data: {
  email: string
  amountGHS: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, string>
}): Promise<InitializePaymentResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    // Mock mode — log and return a fake reference
    console.log('[Paystack MOCK] Would initialize payment:', data)
    return {
      success: true,
      authorizationUrl: '#mock-paystack',
      reference: data.reference,
      mock: true,
    }
  }

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email:        data.email,
      amount:       Math.round(data.amountGHS * 100), // Paystack uses kobo (pesewas for GHS)
      reference:    data.reference,
      callback_url: data.callbackUrl,
      currency:     'GHS',
      metadata:     data.metadata ?? {},
    }),
  })

  const json = await res.json()
  if (!res.ok || !json.status) {
    return { success: false, error: json.message ?? 'Payment initialization failed' }
  }

  return {
    success:          true,
    authorizationUrl: json.data.authorization_url,
    reference:        json.data.reference,
  }
}

export async function verifyPayment(reference: string): Promise<{
  success: boolean; paid: boolean; amount: number; error?: string
}> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return { success: true, paid: true, amount: 0, error: 'Mock mode' }
  }

  const res  = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const json = await res.json()

  if (!res.ok || !json.status) {
    return { success: false, paid: false, amount: 0, error: json.message }
  }

  return {
    success: true,
    paid:    json.data.status === 'success',
    amount:  json.data.amount / 100,
  }
}
