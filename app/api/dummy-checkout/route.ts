import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generate a random dummy transaction ID
  const dummyTxnId = `dummy_${Math.random().toString(36).substring(2, 15)}`

  // 1. Record the dummy payment in the separate table
  const { error: paymentError } = await supabase
    .from('dummy_payments')
    .insert({
      user_id: user.id,
      amount: 499,
      status: 'captured',
      dummy_txn_id: dummyTxnId
    })

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 })
  }

  // 2. Update the user profile to simulate an active subscription
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      subscription_status: 'active' 
    })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, txn_id: dummyTxnId })
}
