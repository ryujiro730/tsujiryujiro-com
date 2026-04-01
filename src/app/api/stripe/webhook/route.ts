import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, tokens } = session.metadata ?? {}

    if (!userId || !tokens) {
      console.error('Missing metadata in session:', session.id)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const tokenCount = parseInt(tokens)
    const supabase = createAdminClient()

    // トークンを追加
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()

    if (profile) {
      await supabase
        .from('profiles')
        .update({ points: profile.points + tokenCount })
        .eq('id', userId)

      const priceYen = session.amount_total ?? null

      await supabase.from('point_transactions').insert({
        user_id: userId,
        amount: tokenCount,
        type: 'purchase',
        description: `${tokenCount}トークン購入`,
        price_yen: priceYen,
      })
    }
  }

  return NextResponse.json({ received: true })
}

// Stripeのwebhookはraw bodyが必要なのでbodyParserを無効化
export const dynamic = 'force-dynamic'
